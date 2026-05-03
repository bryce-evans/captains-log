export type Listener<T> = (payload: T) => void;

export class TypedEventEmitter<EventMap extends Record<string, unknown>> {
  private readonly listeners: Map<keyof EventMap, Set<Listener<unknown>>> = new Map();

  on<K extends keyof EventMap>(event: K, cb: Listener<EventMap[K]>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }
    bucket.add(cb as Listener<unknown>);
    return () => {
      const current = this.listeners.get(event);
      if (current) {
        current.delete(cb as Listener<unknown>);
      }
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }
    for (const listener of Array.from(bucket)) {
      (listener as Listener<EventMap[K]>)(payload);
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}
