import type { WhisperService } from './WhisperService';
import { WhisperRealAdapter } from './WhisperRealAdapter';
import { WhisperStubAdapter } from './WhisperStubAdapter';

export type { WhisperService } from './WhisperService';
export type {
  TranscriptionInput,
  TranscriptionResult,
  TranscriptionSegment,
  WhisperConfig,
} from './types';

let memoized: WhisperService | null = null;

function shouldUseStub(): boolean {
  if (process.env.EXPO_PUBLIC_USE_WHISPER_STUB === 'true') {
    return true;
  }
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  return false;
}

export function getWhisperService(): WhisperService {
  if (memoized) {
    return memoized;
  }
  memoized = shouldUseStub() ? new WhisperStubAdapter() : new WhisperRealAdapter();
  return memoized;
}

export function __resetWhisperService(): void {
  memoized = null;
}

export { WhisperRealAdapter } from './WhisperRealAdapter';
export { WhisperStubAdapter } from './WhisperStubAdapter';
