export type {
  MicChunk,
  MicService,
  StartRecordingOptions,
  StopRecordingResult,
} from './MicService';
export { ExpoAvMicService, createMicService } from './MicService';
export { MicStubService } from './MicStubService';
export {
  emitInterruption,
  subscribeToInterruptions,
  type InterruptionEvent,
  type InterruptionReason,
} from './interruptions';
export {
  getMicPermissionState,
  requestMicPermissions,
  type MicPermissionState,
} from './permissions';
