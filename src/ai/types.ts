import type { Schema } from '../db/schema';

export interface QueryRequest {
  readonly question: string;
  readonly activeSchema: Schema | null;
  readonly recentRecordCount?: number;
}

export interface QueryResult {
  readonly question: string;
  readonly sql: string | null;
  readonly rows: ReadonlyArray<Record<string, unknown>>;
  readonly text: string;
  readonly latencyMs: number;
}

export interface AIQueryEngine {
  answer(req: QueryRequest): Promise<QueryResult>;
}

export class AIQueryNetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AIQueryNetworkError';
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export class AIQueryTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIQueryTimeoutError';
  }
}

export class AIQueryMalformedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIQueryMalformedError';
  }
}

export class UnsafeQueryError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`Unsafe SQL query rejected: ${reason}`);
    this.name = 'UnsafeQueryError';
    this.reason = reason;
  }
}
