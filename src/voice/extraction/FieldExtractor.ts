export type { ExtractionInput, ExtractionResult, FieldExtractor } from './types';

const NULLISH_TOKENS = new Set(['', 'null', 'unknown', 'none', 'n/a', 'na']);

export function filterNullish(
  raw: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (NULLISH_TOKENS.has(trimmed)) {
        continue;
      }
      out[key] = value.trim();
      continue;
    }
    out[key] = value;
  }
  return Object.freeze(out);
}
