import type { FieldValue, RecordRow, Schema, SchemaField } from '../db/schema';
import { validateAgainstSchema, type ValidationError } from '../db/validateAgainstSchema';

import { TranscriptionHandler } from './TranscriptionHandler';
import { defaultDoneDetector, type DoneDetector } from './doneDetector';
import type { FieldExtractor } from './extraction/types';
import { TypedEventEmitter } from './internal/EventEmitter';
import type { MicService } from './mic/MicService';
import type { WhisperService } from './whisper/WhisperService';

export type VoiceSessionStatus =
  | 'idle'
  | 'starting'
  | 'listening'
  | 'processing'
  | 'finalizing'
  | 'done'
  | 'error';

export interface FieldUpdateEvent {
  readonly key: string;
  readonly value: string | number;
}

export interface FieldRejectionEvent {
  readonly key: string;
  readonly error: ValidationError;
}

export interface NeedsReviewEvent {
  readonly emptyImportantKeys: readonly string[];
}

export interface VoiceSessionEvents extends Record<string, unknown> {
  status: VoiceSessionStatus;
  partial: string;
  final: string;
  fieldUpdate: FieldUpdateEvent;
  rejected: FieldRejectionEvent;
  doneDetected: { transcript: string };
  error: Error;
  needsReview: NeedsReviewEvent;
  completed: { record: RecordRow };
}

export interface MarkDoneSessionOptions {
  readonly audioPath?: string | null;
  readonly photoPaths?: readonly string[];
}

export type MarkDoneSessionResult =
  | { readonly status: 'saved'; readonly record: RecordRow }
  | { readonly status: 'needs_review'; readonly emptyImportantFields: readonly SchemaField[] };

export interface VoiceSessionDeps {
  readonly mic: MicService;
  readonly whisper: WhisperService;
  readonly extractor: FieldExtractor;
  readonly schema: Schema;
  readonly setField: (key: string, value: FieldValue) => void;
  readonly markDone: (opts?: MarkDoneSessionOptions) => Promise<MarkDoneSessionResult>;
  readonly clearDraft?: () => void;
  readonly doneDetector?: DoneDetector;
  readonly transcription?: TranscriptionHandler;
  readonly chunkDurationMs?: number;
}

export interface VoiceSessionStartOptions {
  readonly audioPath?: string;
  readonly photoPaths?: readonly string[];
}

export class VoiceSession {
  private _status: VoiceSessionStatus = 'idle';
  private readonly emitter = new TypedEventEmitter<VoiceSessionEvents>();
  private readonly transcription: TranscriptionHandler;
  private readonly extractor: FieldExtractor;
  private readonly mic: MicService;
  private readonly schema: Schema;
  private readonly setField: (key: string, value: FieldValue) => void;
  private readonly markDoneFn: (opts?: MarkDoneSessionOptions) => Promise<MarkDoneSessionResult>;
  private readonly clearDraft?: () => void;
  private readonly doneDetectorFn: DoneDetector;
  private pendingExtractions = new Set<{
    controller: AbortController;
    promise: Promise<void>;
  }>();
  private finalizing = false;
  private finalized = false;
  private startOptions: VoiceSessionStartOptions = {};
  private unsubscribeFns: Array<() => void> = [];

  constructor(deps: VoiceSessionDeps) {
    this.mic = deps.mic;
    this.extractor = deps.extractor;
    this.schema = deps.schema;
    this.setField = deps.setField;
    this.markDoneFn = deps.markDone;
    this.clearDraft = deps.clearDraft;
    this.doneDetectorFn = deps.doneDetector ?? defaultDoneDetector;
    this.transcription =
      deps.transcription ??
      new TranscriptionHandler({
        mic: deps.mic,
        whisper: deps.whisper,
        chunkDurationMs: deps.chunkDurationMs,
      });
  }

  get status(): VoiceSessionStatus {
    return this._status;
  }

  on<K extends keyof VoiceSessionEvents>(
    event: K,
    cb: (payload: VoiceSessionEvents[K]) => void,
  ): () => void {
    return this.emitter.on(event, cb);
  }

  // Test seam: feed a transcript chunk without going through mic/whisper.
  feedTranscript(text: string): void {
    this.transcription.feedTranscript(text);
  }

  async start(opts?: VoiceSessionStartOptions): Promise<void> {
    if (this._status !== 'idle' && this._status !== 'done' && this._status !== 'error') {
      return;
    }
    this.startOptions = opts ?? {};
    this.finalizing = false;
    this.finalized = false;
    this.setStatus('starting');
    this.unsubscribeFns.push(
      this.transcription.onPartial((text) => {
        this.emitter.emit('partial', text);
      }),
    );
    this.unsubscribeFns.push(
      this.transcription.onFinal((text) => {
        void this.handleFinal(text);
      }),
    );
    this.unsubscribeFns.push(
      this.transcription.onError((err) => {
        this.emitter.emit('error', err);
      }),
    );
    try {
      await this.transcription.start();
      this.setStatus('listening');
    } catch (err) {
      this.setStatus('error');
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  async stop(): Promise<void> {
    if (this._status === 'idle' || this._status === 'done') {
      return;
    }
    if (this.finalizing || this.finalized) {
      return;
    }
    try {
      await this.transcription.stop();
    } catch (err) {
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
    await this.finalize('user-stop');
  }

  async cancel(): Promise<void> {
    if (this._status === 'idle' || this._status === 'done') {
      return;
    }
    this.finalized = true;
    this.finalizing = false;
    this.abortPending();
    try {
      await this.transcription.cancel();
    } catch {
      // best-effort
    }
    try {
      await this.mic.cleanup();
    } catch {
      // best-effort
    }
    this.cleanupSubscriptions();
    this.setStatus('idle');
  }

  private async handleFinal(text: string): Promise<void> {
    if (this.finalized) {
      return;
    }
    this.emitter.emit('final', text);
    const isDone = this.doneDetectorFn(text);
    if (isDone) {
      this.emitter.emit('doneDetected', { transcript: text });
    }
    await this.runExtraction(text);
    if (isDone && !this.finalizing && !this.finalized) {
      await this.finalize('done-detected');
    }
  }

  private async runExtraction(transcript: string): Promise<void> {
    this.setStatus('processing');
    const controller = new AbortController();
    const entry = { controller, promise: Promise.resolve() };
    entry.promise = this.executeExtraction(transcript, controller).finally(() => {
      this.pendingExtractions.delete(entry);
      if (this._status === 'processing' && !this.finalizing && !this.finalized) {
        this.setStatus('listening');
      }
    });
    this.pendingExtractions.add(entry);
    await entry.promise;
  }

  private async executeExtraction(transcript: string, controller: AbortController): Promise<void> {
    try {
      const result = await this.extractor.extract({
        transcript,
        schema: this.schema,
        signal: controller.signal,
      });
      if (this.finalized) {
        return;
      }
      const validation = validateAgainstSchema(result.extracted, this.schema);
      for (const [key, value] of Object.entries(validation.accepted)) {
        this.setField(key, value);
        this.emitter.emit('fieldUpdate', { key, value });
      }
      for (const [key, error] of Object.entries(validation.rejected)) {
        this.emitter.emit('rejected', { key, error });
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async finalize(_reason: 'user-stop' | 'done-detected'): Promise<void> {
    if (this.finalizing || this.finalized) {
      return;
    }
    this.finalizing = true;
    this.setStatus('finalizing');
    await this.drainPending();
    if (this.finalized) {
      return;
    }
    try {
      const result = await this.markDoneFn({
        audioPath: this.startOptions.audioPath ?? null,
        photoPaths: this.startOptions.photoPaths ?? [],
      });
      this.finalized = true;
      this.cleanupSubscriptions();
      try {
        await this.mic.cleanup();
      } catch {
        // best-effort
      }
      if (result.status === 'needs_review') {
        this.emitter.emit('needsReview', {
          emptyImportantKeys: result.emptyImportantFields.map((f) => f.key),
        });
        this.setStatus('done');
        return;
      }
      this.emitter.emit('completed', { record: result.record });
      this.setStatus('done');
    } catch (err) {
      this.finalizing = false;
      this.setStatus('error');
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async drainPending(): Promise<void> {
    if (this.pendingExtractions.size === 0) {
      return;
    }
    const snapshots = Array.from(this.pendingExtractions);
    // We wait for in-flight extractions so any field updates from the last
    // utterance are applied before markDone runs. Cancellation happens only
    // through cancel().
    await Promise.allSettled(snapshots.map((entry) => entry.promise));
  }

  private abortPending(): void {
    for (const entry of this.pendingExtractions) {
      entry.controller.abort();
    }
    this.pendingExtractions.clear();
  }

  private cleanupSubscriptions(): void {
    for (const off of this.unsubscribeFns) {
      off();
    }
    this.unsubscribeFns = [];
  }

  private setStatus(next: VoiceSessionStatus): void {
    if (this._status === next) {
      return;
    }
    this._status = next;
    this.emitter.emit('status', next);
  }
}
