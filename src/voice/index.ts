export {
  ExtractionMalformedError,
  ExtractionNetworkError,
  ExtractionTimeoutError,
  MicPermissionDeniedError,
  MicSessionError,
  WhisperInferenceError,
  WhisperUnavailableError,
} from './errors';

export { TranscriptionHandler } from './TranscriptionHandler';
export type { TranscriptionHandlerDeps } from './TranscriptionHandler';

export {
  VoiceSession,
  type FieldRejectionEvent,
  type FieldUpdateEvent,
  type NeedsReviewEvent,
  type VoiceSessionDeps,
  type VoiceSessionEvents,
  type VoiceSessionStartOptions,
  type VoiceSessionStatus,
} from './VoiceSession';

export {
  QueryVoiceSession,
  type AIQueryAnswer,
  type AIQueryEngineLike,
  type QueryVoiceResult,
  type QueryVoiceSessionDeps,
  type TTSService,
} from './QueryVoiceSession';

export { defaultDoneDetector, makeDoneDetector, type DoneDetector } from './doneDetector';

export { getWhisperService, WhisperRealAdapter, WhisperStubAdapter } from './whisper';
export type {
  TranscriptionInput,
  TranscriptionResult,
  WhisperConfig,
  WhisperService,
} from './whisper';

export {
  createMicService,
  ExpoAvMicService,
  emitInterruption,
  getMicPermissionState,
  requestMicPermissions,
  subscribeToInterruptions,
} from './mic';
export type {
  InterruptionEvent,
  InterruptionReason,
  MicChunk,
  MicPermissionState,
  MicService,
  StartRecordingOptions,
  StopRecordingResult,
} from './mic';

export {
  buildFunctionSchema,
  getFieldExtractor,
  OpenAIFieldExtractor,
  StubFieldExtractor,
} from './extraction';
export type { ExtractionInput, ExtractionResult, FieldExtractor } from './extraction';

export { ExpoSpeechTTS, createTTSService } from './tts';
