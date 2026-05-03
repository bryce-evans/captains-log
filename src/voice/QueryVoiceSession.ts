import type { MicService } from './mic/MicService';
import type { WhisperService } from './whisper/WhisperService';

export interface AIQueryAnswer {
  readonly text: string;
  readonly sql?: string;
  readonly rows?: unknown[];
}

export interface AIQueryEngineLike {
  answer(question: string): Promise<AIQueryAnswer>;
}

export interface TTSService {
  speak(text: string): Promise<void>;
  stop(): Promise<void>;
}

export interface QueryVoiceSessionDeps {
  readonly mic: MicService;
  readonly whisper: WhisperService;
  readonly aiQueryEngine: AIQueryEngineLike;
  readonly tts: TTSService;
  readonly chunkDurationMs?: number;
}

export interface QueryVoiceResult {
  readonly question: string;
  readonly answer: string;
}

const DEFAULT_QUERY_CHUNK_MS = 4000;

// Sequence ordering matters per TASKS.md T016: we fully stop and unload the
// mic before invoking expo-speech to avoid Android audio-session hangs.
//
// The session is driven by user taps from the screen layer:
//   1. `startListening()`  — primes whisper (if needed) and opens the mic.
//   2. `stopAndProcess()`  — closes the mic, transcribes, runs the engine,
//      cleans up, then speaks the answer. Returns the question/answer pair.
//   3. `cancel()`          — best-effort teardown without transcribing.
// Calling `stopAndProcess()` without a prior `startListening()` is rejected.
export class QueryVoiceSession {
  private readonly mic: MicService;
  private readonly whisper: WhisperService;
  private readonly engine: AIQueryEngineLike;
  private readonly tts: TTSService;
  private readonly chunkDurationMs: number;
  private listening = false;

  constructor(deps: QueryVoiceSessionDeps) {
    this.mic = deps.mic;
    this.whisper = deps.whisper;
    this.engine = deps.aiQueryEngine;
    this.tts = deps.tts;
    this.chunkDurationMs = deps.chunkDurationMs ?? DEFAULT_QUERY_CHUNK_MS;
  }

  isListening(): boolean {
    return this.listening;
  }

  async startListening(): Promise<void> {
    if (this.listening) {
      return;
    }
    if (!this.whisper.isReady()) {
      await this.whisper.initialize();
    }
    await this.mic.startRecording({ chunkDurationMs: this.chunkDurationMs });
    this.listening = true;
  }

  async stopAndProcess(): Promise<QueryVoiceResult> {
    if (!this.listening) {
      throw new Error('QueryVoiceSession.stopAndProcess called before startListening');
    }
    this.listening = false;
    const stopped = await this.mic.stopRecording();
    const result = await this.whisper.transcribe({ audioUri: stopped.uri });
    const question = result.text.trim();
    const answer = await this.engine.answer(question);
    await this.mic.cleanup();
    await this.tts.speak(answer.text);
    return { question, answer: answer.text };
  }

  async cancel(): Promise<void> {
    if (!this.listening) {
      return;
    }
    this.listening = false;
    try {
      await this.mic.stopRecording();
    } catch {
      // best-effort
    }
    try {
      await this.mic.cleanup();
    } catch {
      // best-effort
    }
  }
}
