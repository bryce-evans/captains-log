import { TypedEventEmitter } from '../internal/EventEmitter';

export type InterruptionReason = 'began' | 'ended';

export interface InterruptionEvent {
  readonly reason: InterruptionReason;
  readonly at: number;
}

interface InterruptionEvents extends Record<string, unknown> {
  interruption: InterruptionEvent;
}

const emitter = new TypedEventEmitter<InterruptionEvents>();

export function emitInterruption(reason: InterruptionReason): void {
  emitter.emit('interruption', { reason, at: Date.now() });
}

export function subscribeToInterruptions(cb: (event: InterruptionEvent) => void): () => void {
  return emitter.on('interruption', cb);
}

// expo-av historically does not expose a JS-level "interruption observer" API
// across iOS and Android consistently. We surface our own event hook so the
// MicService and integration tests can simulate interruption-triggered teardown.
// On a real device, native code raises this via app-state changes which we map
// to emitInterruption('began') from the screen-level integration in WS3.
