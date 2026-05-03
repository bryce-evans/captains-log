/**
 * ExtractionRetryQueue — persists (transcript, schemaId) pairs that failed
 * GPT-4o extraction because of network issues so we can replay them when
 * connectivity returns.
 *
 * The queue is intentionally tiny: AsyncStorage holds a JSON array under a
 * single key. We don't dedupe — each utterance is independent. On drain we
 * walk the queue front-to-back and re-issue extractions; entries that still
 * fail with a network error are preserved at the front, while malformed or
 * non-network failures are dropped (the user has moved on).
 *
 * The connectivity bridge subscribes to NetInfo and triggers a drain when
 * the network flips back to connected. Unsubscribe is the caller's job.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import type { Schema } from '../db/schema';
import { ExtractionNetworkError } from '../voice/errors';
import type { ExtractionResult, FieldExtractor } from '../voice/extraction/types';

const STORAGE_KEY = 'captainslog.extractionRetryQueue';

export interface RetryQueueEntry {
  readonly transcript: string;
  readonly schemaId: string;
  readonly enqueuedAt: number;
}

export interface DrainResult {
  readonly attempted: number;
  readonly succeeded: number;
  readonly results: ReadonlyArray<{ entry: RetryQueueEntry; result: ExtractionResult }>;
  readonly remaining: ReadonlyArray<RetryQueueEntry>;
}

export interface SchemaResolver {
  findById(id: string): Promise<Schema | null>;
}

async function readQueue(): Promise<ReadonlyArray<RetryQueueEntry>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isRetryEntry);
  } catch {
    return [];
  }
}

function isRetryEntry(value: unknown): value is RetryQueueEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.transcript === 'string' &&
    typeof candidate.schemaId === 'string' &&
    typeof candidate.enqueuedAt === 'number'
  );
}

async function writeQueue(entries: ReadonlyArray<RetryQueueEntry>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function enqueue(transcript: string, schemaId: string): Promise<void> {
  const trimmed = transcript.trim();
  if (trimmed === '' || schemaId === '') {
    return;
  }
  const current = await readQueue();
  const next: ReadonlyArray<RetryQueueEntry> = [
    ...current,
    Object.freeze({ transcript: trimmed, schemaId, enqueuedAt: Date.now() }),
  ];
  await writeQueue(next);
}

export async function peek(): Promise<ReadonlyArray<RetryQueueEntry>> {
  return readQueue();
}

export async function clear(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function drain(
  extractor: FieldExtractor,
  schemas: SchemaResolver,
): Promise<DrainResult> {
  const queue = await readQueue();
  if (queue.length === 0) {
    return Object.freeze({ attempted: 0, succeeded: 0, results: [], remaining: [] });
  }

  const remaining: RetryQueueEntry[] = [];
  const results: Array<{ entry: RetryQueueEntry; result: ExtractionResult }> = [];
  let succeeded = 0;
  for (const entry of queue) {
    const schema = await schemas.findById(entry.schemaId);
    if (!schema) {
      continue;
    }
    try {
      const result = await extractor.extract({ transcript: entry.transcript, schema });
      results.push({ entry, result });
      succeeded += 1;
    } catch (err) {
      if (err instanceof ExtractionNetworkError) {
        remaining.push(entry);
      }
    }
  }
  await writeQueue(remaining);
  return Object.freeze({
    attempted: queue.length,
    succeeded,
    results: Object.freeze(results),
    remaining: Object.freeze([...remaining]),
  });
}

export type ConnectivityUnsubscribe = () => void;

export function subscribeToConnectivity(
  extractor: FieldExtractor,
  schemas: SchemaResolver,
  onDrained?: (result: DrainResult) => void,
): ConnectivityUnsubscribe {
  let lastConnected: boolean | null = null;
  const unsubscribe = NetInfo.addEventListener((state) => {
    const isConnected = state.isConnected === true && state.isInternetReachable !== false;
    if (lastConnected === false && isConnected) {
      void drain(extractor, schemas).then((result) => {
        if (onDrained) {
          onDrained(result);
        }
      });
    }
    lastConnected = isConnected;
  });
  return unsubscribe;
}

export const ExtractionRetryQueue = {
  enqueue,
  peek,
  clear,
  drain,
  subscribeToConnectivity,
} as const;
