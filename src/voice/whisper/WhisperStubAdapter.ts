import type { WhisperService } from './WhisperService';
import type { TranscriptionInput, TranscriptionResult, WhisperConfig } from './types';

const STUB_LATENCY_MS = 200;

const CANNED_TRANSCRIPTS: ReadonlyArray<{ readonly match: string; readonly text: string }> = [
  { match: 'test1', text: 'I caught a 14 inch perch off the dock' },
  { match: 'test2', text: 'I caught a 22 inch bass at sunset' },
  { match: 'art', text: 'Sold a small landscape painting for 120 dollars to Sarah' },
  { match: 'done', text: "okay that's it I'm done" },
  { match: 'query', text: 'what was my biggest fish' },
];

const DEFAULT_TRANSCRIPT = 'Hello world';

function basenameFromUri(uri: string): string {
  const slash = uri.lastIndexOf('/');
  return slash >= 0 ? uri.slice(slash + 1).toLowerCase() : uri.toLowerCase();
}

function pickTranscript(uri: string): string {
  const basename = basenameFromUri(uri);
  for (const candidate of CANNED_TRANSCRIPTS) {
    if (basename.includes(candidate.match)) {
      return candidate.text;
    }
  }
  return DEFAULT_TRANSCRIPT;
}

export interface StubAdapterOptions {
  readonly latencyMs?: number;
  readonly transcripts?: ReadonlyArray<{ readonly match: string; readonly text: string }>;
  readonly defaultTranscript?: string;
}

export class WhisperStubAdapter implements WhisperService {
  private ready = false;
  private readonly latencyMs: number;
  private readonly transcripts: ReadonlyArray<{ readonly match: string; readonly text: string }>;
  private readonly defaultTranscript: string;

  constructor(options?: StubAdapterOptions) {
    this.latencyMs = options?.latencyMs ?? STUB_LATENCY_MS;
    this.transcripts = options?.transcripts ?? CANNED_TRANSCRIPTS;
    this.defaultTranscript = options?.defaultTranscript ?? DEFAULT_TRANSCRIPT;
  }

  async initialize(_config?: WhisperConfig): Promise<void> {
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    if (!this.ready) {
      this.ready = true;
    }
    const startedAt = Date.now();
    await new Promise<void>((resolve) => setTimeout(resolve, this.latencyMs));
    const basename = basenameFromUri(input.audioUri);
    let text = this.defaultTranscript;
    for (const candidate of this.transcripts) {
      if (basename.includes(candidate.match)) {
        text = candidate.text;
        break;
      }
    }
    return {
      text,
      segments: [{ start: 0, end: 1000, text }],
      latencyMs: Date.now() - startedAt,
    };
  }

  async dispose(): Promise<void> {
    this.ready = false;
  }
}

export const __testHelpers = { pickTranscript };
