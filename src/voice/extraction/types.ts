import type { Schema } from '../../db/schema';

export interface ExtractionInput {
  readonly transcript: string;
  readonly schema: Schema;
  readonly signal?: AbortSignal;
}

export interface ExtractionResult {
  readonly extracted: Readonly<Record<string, unknown>>;
  readonly latencyMs: number;
}

export interface FieldExtractor {
  extract(input: ExtractionInput): Promise<ExtractionResult>;
}
