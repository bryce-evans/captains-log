export interface WhisperConfig {
  readonly modelPath?: string;
  readonly language?: string;
}

export interface TranscriptionInput {
  readonly audioUri: string;
  readonly mimeType?: string;
}

export interface TranscriptionSegment {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface TranscriptionResult {
  readonly text: string;
  readonly segments?: readonly TranscriptionSegment[];
  readonly latencyMs: number;
}
