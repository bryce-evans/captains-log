import * as FileSystem from 'expo-file-system/legacy';

import { logger } from '@/utils/logger';

import type {
  MicChunk,
  MicService,
  StartRecordingOptions,
  StopRecordingResult,
} from './MicService';

const DEFAULT_CHUNK_MS = 2000;
const STUB_AUDIO_BASENAME = 'stub_audio';

// Cycled across chunk indexes so the WhisperStubAdapter's URI-basename
// keyword match returns useful canned transcripts in sequence — first
// utterance fills fields (perch / 14"), second triggers the done detector.
const CHUNK_KEYWORDS: readonly string[] = ['test1', 'done'];
const FINAL_KEYWORD = 'done';

/**
 * Simulator-friendly mic service. iOS Simulator has no microphone, so this
 * stub mimics the lifecycle without touching expo-av:
 *   - emits canned chunks at the requested cadence so transcription handlers
 *     produce one final transcript per chunk
 *   - returns a deterministic file:// URI shaped so WhisperStubAdapter's
 *     basename heuristic returns a useful canned transcript
 */
export class MicStubService implements MicService {
  private recording = false;
  private startedAt = 0;
  private chunkIndex = 0;
  private chunkTimer: ReturnType<typeof setTimeout> | null = null;
  private opts: StartRecordingOptions = {};

  async requestPermission(): Promise<boolean> {
    return true;
  }

  async startRecording(opts: StartRecordingOptions = {}): Promise<void> {
    if (this.recording) return;
    this.recording = true;
    this.startedAt = Date.now();
    this.chunkIndex = 0;
    this.opts = opts;
    this.scheduleNextChunk();
    logger.warn('[mic-stub] recording started');
  }

  async stopRecording(): Promise<StopRecordingResult> {
    if (!this.recording) {
      return { uri: this.makeStubUri('final'), durationMs: 0 };
    }
    this.recording = false;
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
    const durationMs = Date.now() - this.startedAt;
    // Heuristic: short recordings (no chunks fired yet) are query mode — the
    // user tapped the mic, asked a brief question, tapped again. Longer
    // recordings have already fired chunks, so this is a journal session
    // and the user is signalling "done".
    const finalKeyword = this.chunkIndex === 0 ? 'query' : FINAL_KEYWORD;
    return { uri: this.makeStubUri(`${finalKeyword}_final`), durationMs };
  }

  isRecording(): boolean {
    return this.recording;
  }

  async cleanup(): Promise<void> {
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }
    this.recording = false;
  }

  private scheduleNextChunk(): void {
    const chunkMs = this.opts.chunkDurationMs ?? DEFAULT_CHUNK_MS;
    this.chunkTimer = setTimeout(() => {
      if (!this.recording) return;
      const keyword = CHUNK_KEYWORDS[this.chunkIndex % CHUNK_KEYWORDS.length] ?? 'test1';
      const chunk: MicChunk = {
        uri: this.makeStubUri(`${keyword}_chunk_${this.chunkIndex}`),
        index: this.chunkIndex,
        durationMs: chunkMs,
      };
      this.chunkIndex += 1;
      try {
        this.opts.onChunk?.(chunk);
      } catch (err) {
        logger.warn('[mic-stub] onChunk handler failed', err);
      }
      this.scheduleNextChunk();
    }, chunkMs);
  }

  private makeStubUri(label: string): string {
    const base = FileSystem.documentDirectory ?? 'file:///stub/';
    return `${base}${STUB_AUDIO_BASENAME}_${label}.wav`;
  }
}
