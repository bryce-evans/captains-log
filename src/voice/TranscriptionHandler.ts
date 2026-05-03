import { TypedEventEmitter } from './internal/EventEmitter';
import type { MicChunk, MicService } from './mic/MicService';
import type { WhisperService } from './whisper/WhisperService';

export interface TranscriptionHandlerDeps {
  readonly mic: MicService;
  readonly whisper: WhisperService;
  readonly chunkDurationMs?: number;
  readonly silenceChunkThreshold?: number;
  /**
   * When true, every transcribed chunk emits a `final` event immediately
   * (treating each chunk as a complete utterance). Useful when running
   * the stub whisper adapter in development, where canned transcripts are
   * always full sentences and natural silence detection won't fire.
   */
  readonly utterancePerChunk?: boolean;
}

interface TranscriptionEvents extends Record<string, unknown> {
  partial: string;
  final: string;
  error: Error;
}

const DEFAULT_CHUNK_MS = 2000;
const DEFAULT_SILENCE_THRESHOLD = 1;

function defaultUtterancePerChunk(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  return process.env.EXPO_PUBLIC_USE_WHISPER_STUB === 'true';
}

// Silence detection here is intentionally simple: when a chunk transcribes to
// an empty / whitespace-only string we count that as a silence chunk. After
// `silenceChunkThreshold` such chunks in a row, or when stop() is invoked, we
// emit `final` with whatever text we have accumulated since the last final.
// More accurate amplitude-based VAD is a follow-up.
export class TranscriptionHandler {
  private readonly mic: MicService;
  private readonly whisper: WhisperService;
  private readonly chunkDurationMs: number;
  private readonly silenceChunkThreshold: number;
  private readonly utterancePerChunk: boolean;
  private readonly emitter = new TypedEventEmitter<TranscriptionEvents>();
  private buffer = '';
  private silenceCount = 0;
  private running = false;

  constructor(deps: TranscriptionHandlerDeps) {
    this.mic = deps.mic;
    this.whisper = deps.whisper;
    this.chunkDurationMs = deps.chunkDurationMs ?? DEFAULT_CHUNK_MS;
    this.silenceChunkThreshold = deps.silenceChunkThreshold ?? DEFAULT_SILENCE_THRESHOLD;
    this.utterancePerChunk = deps.utterancePerChunk ?? defaultUtterancePerChunk();
  }

  onPartial(cb: (text: string) => void): () => void {
    return this.emitter.on('partial', cb);
  }

  onFinal(cb: (text: string) => void): () => void {
    return this.emitter.on('final', cb);
  }

  onError(cb: (err: Error) => void): () => void {
    return this.emitter.on('error', cb);
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    if (!this.whisper.isReady()) {
      await this.whisper.initialize();
    }
    this.running = true;
    this.buffer = '';
    this.silenceCount = 0;
    await this.mic.startRecording({
      chunkDurationMs: this.chunkDurationMs,
      onChunk: (chunk) => {
        void this.handleChunk(chunk);
      },
    });
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.running = false;
    let finalUri = '';
    try {
      const stopped = await this.mic.stopRecording();
      finalUri = stopped.uri;
    } catch (err) {
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
    if (finalUri) {
      await this.transcribeAndAccumulate(finalUri);
    }
    this.flushFinal();
  }

  async cancel(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.running = false;
    try {
      await this.mic.stopRecording();
    } catch {
      // best-effort
    }
    this.buffer = '';
    this.silenceCount = 0;
  }

  feedTranscript(text: string): void {
    // Test seam: bypass mic and whisper to inject a complete utterance and
    // immediately emit it as `final`, mirroring what end-of-utterance silence
    // detection would produce in the real pipeline.
    const trimmed = text.trim();
    if (trimmed === '') {
      return;
    }
    this.buffer = this.buffer ? `${this.buffer} ${trimmed}` : trimmed;
    this.silenceCount = 0;
    this.emitter.emit('partial', this.buffer);
    this.flushFinal();
  }

  finalize(): void {
    this.flushFinal();
  }

  private async handleChunk(chunk: MicChunk): Promise<void> {
    if (!this.running) {
      return;
    }
    await this.transcribeAndAccumulate(chunk.uri);
    if (this.utterancePerChunk) {
      this.flushFinal();
      return;
    }
    this.maybeEmitFinalOnSilence();
  }

  private async transcribeAndAccumulate(uri: string): Promise<void> {
    try {
      const result = await this.whisper.transcribe({ audioUri: uri });
      this.appendChunkText(result.text);
    } catch (err) {
      this.emitter.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  private appendChunkText(text: string): void {
    const trimmed = text.trim();
    if (trimmed === '') {
      this.silenceCount += 1;
      this.emitter.emit('partial', this.buffer);
      return;
    }
    this.silenceCount = 0;
    this.buffer = this.buffer ? `${this.buffer} ${trimmed}` : trimmed;
    this.emitter.emit('partial', this.buffer);
  }

  private maybeEmitFinalOnSilence(): void {
    if (this.buffer.length > 0 && this.silenceCount >= this.silenceChunkThreshold) {
      this.flushFinal();
    }
  }

  private flushFinal(): void {
    const text = this.buffer.trim();
    this.buffer = '';
    this.silenceCount = 0;
    if (text.length > 0) {
      this.emitter.emit('final', text);
    }
  }
}
