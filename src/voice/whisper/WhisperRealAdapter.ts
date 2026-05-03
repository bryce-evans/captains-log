import { WhisperInferenceError, WhisperUnavailableError } from '../errors';

import type { WhisperService } from './WhisperService';
import type { TranscriptionInput, TranscriptionResult, WhisperConfig } from './types';

interface WhisperRnSegment {
  readonly text: string;
  readonly t0: number;
  readonly t1: number;
}

interface WhisperRnTranscribeResult {
  readonly result: string;
  readonly language: string;
  readonly segments: readonly WhisperRnSegment[];
  readonly isAborted: boolean;
}

interface WhisperRnContext {
  transcribe(
    filePathOrBase64: string | number,
    options?: { language?: string; translate?: boolean; maxLen?: number },
  ): { promise: Promise<WhisperRnTranscribeResult>; stop: () => Promise<void> };
  release?: () => Promise<void>;
}

interface WhisperRnBinding {
  initWhisper(opts: {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
  }): Promise<WhisperRnContext>;
}

// Bundled via metro.config.js (`bin` added to assetExts). The require() call
// returns a numeric asset module id at runtime which whisper.rn knows how to
// resolve to a local file path on iOS / Android.
//
// We wrap it in a function so the require throws at call time (not module
// load time) — that lets dev environments without the .bin file imported
// indirectly (e.g. tests) at least import the module.
function requireBundledModel(): number {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../../../assets/models/ggml-base.en-q5_1.bin') as number;
}

async function loadBinding(): Promise<WhisperRnBinding> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('whisper.rn') as WhisperRnBinding;
    return mod;
  } catch (err) {
    throw new WhisperUnavailableError(
      `whisper.rn could not be loaded: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export class WhisperRealAdapter implements WhisperService {
  private context: WhisperRnContext | null = null;
  private ready = false;
  private language: string;
  private modelOverride: string | undefined;

  constructor(config?: WhisperConfig) {
    this.language = config?.language ?? 'en';
    this.modelOverride = config?.modelPath;
  }

  async initialize(config?: WhisperConfig): Promise<void> {
    if (this.ready && this.context) {
      return;
    }
    if (config?.language) {
      this.language = config.language;
    }
    if (config?.modelPath) {
      this.modelOverride = config.modelPath;
    }

    const binding = await loadBinding();
    try {
      const context = this.modelOverride
        ? await binding.initWhisper({ filePath: this.modelOverride })
        : await binding.initWhisper({ filePath: requireBundledModel() });
      this.context = context;
      this.ready = true;
    } catch (err) {
      throw new WhisperInferenceError(
        `Failed to initialize whisper context: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  isReady(): boolean {
    return this.ready && this.context !== null;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (!this.context || !this.ready) {
      throw new WhisperUnavailableError('Whisper has not been initialized');
    }
    const startedAt = Date.now();
    try {
      const { promise } = this.context.transcribe(input.audioUri, { language: this.language });
      const raw = await promise;
      return {
        text: (raw.result ?? '').trim(),
        segments: raw.segments.map((seg) => ({
          start: seg.t0,
          end: seg.t1,
          text: seg.text,
        })),
        latencyMs: Date.now() - startedAt,
      };
    } catch (err) {
      throw new WhisperInferenceError(
        `whisper.rn transcription failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async dispose(): Promise<void> {
    if (this.context && this.context.release) {
      try {
        await this.context.release();
      } catch {
        // best-effort release; native context may already be torn down
      }
    }
    this.context = null;
    this.ready = false;
  }
}
