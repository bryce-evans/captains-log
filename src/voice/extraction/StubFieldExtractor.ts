import type { SchemaField } from '../../db/schema';

import { filterNullish } from './FieldExtractor';
import type { ExtractionInput, ExtractionResult, FieldExtractor } from './types';

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

function findNumber(transcript: string): number | null {
  const digitMatch = transcript.match(/-?\d+(?:\.\d+)?/);
  if (digitMatch) {
    const parsed = Number(digitMatch[0]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  const lower = transcript.toLowerCase();
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) {
      return value;
    }
  }
  return null;
}

function findEnum(transcript: string, enumValues: readonly string[]): string | null {
  const lower = transcript.toLowerCase();
  for (const value of enumValues) {
    if (lower.includes(value.toLowerCase())) {
      return value;
    }
  }
  return null;
}

function findStringForField(transcript: string, field: SchemaField): string | null {
  const lower = transcript.toLowerCase();
  // simple keyword association: pull the word after the label / key if present
  const labelKey = field.label.toLowerCase();
  const keyword = field.key.toLowerCase();
  const tokens = [labelKey, keyword];
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx >= 0) {
      const after = transcript.slice(idx + token.length).trim();
      const next = after.split(/[.,;\s]+/).filter(Boolean)[0];
      if (next && next.length > 1) {
        return next;
      }
    }
  }
  // domain-specific quick wins for the seeded MVP schemas
  if (field.key === 'species') {
    const species = ['perch', 'bass', 'trout', 'pike', 'walleye', 'salmon'];
    for (const s of species) {
      if (lower.includes(s)) {
        return s;
      }
    }
  }
  if (field.key === 'item') {
    const m = transcript.match(/sold (?:a |an )?([a-zA-Z ]{2,40}?) for/i);
    if (m && m[1]) {
      return m[1].trim();
    }
  }
  if (field.key === 'buyer_name') {
    const m = transcript.match(/to ([A-Z][a-z]+)/);
    if (m && m[1]) {
      return m[1];
    }
  }
  if (field.key === 'location') {
    const m = transcript.match(/(?:at|off|on) (?:the )?([a-zA-Z ]{2,30})$/i);
    if (m && m[1]) {
      return m[1].trim();
    }
  }
  return null;
}

export class StubFieldExtractor implements FieldExtractor {
  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const startedAt = Date.now();
    const out: Record<string, unknown> = {};
    for (const field of input.schema.fields) {
      switch (field.type) {
        case 'number': {
          const value = findNumber(input.transcript);
          if (value !== null) {
            out[field.key] = value;
          }
          break;
        }
        case 'enum': {
          const enumValues = field.enumValues ?? [];
          const value = findEnum(input.transcript, enumValues);
          if (value !== null) {
            out[field.key] = value;
          }
          break;
        }
        case 'string': {
          const value = findStringForField(input.transcript, field);
          if (value !== null) {
            out[field.key] = value;
          }
          break;
        }
        default:
          break;
      }
    }
    return {
      extracted: filterNullish(out),
      latencyMs: Date.now() - startedAt,
    };
  }
}
