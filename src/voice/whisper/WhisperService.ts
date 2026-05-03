import type { TranscriptionInput, TranscriptionResult, WhisperConfig } from './types';

export interface WhisperService {
  initialize(config?: WhisperConfig): Promise<void>;
  isReady(): boolean;
  transcribe(input: TranscriptionInput): Promise<TranscriptionResult>;
  dispose(): Promise<void>;
}
