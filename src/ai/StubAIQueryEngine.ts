/**
 * StubAIQueryEngine — heuristic, no-network fallback used in dev when
 * EXPO_PUBLIC_USE_AI_STUB === 'true' or no OPENAI_API_KEY is configured.
 *
 * Limitations (intentional):
 * - Only understands a handful of phrasings: "how many", "count", "biggest",
 *   "smallest", "average", "longest", "shortest", "list".
 * - Operates over the active schema only — falls back to "all records" if
 *   the active schema is null.
 * - Does NOT generate SQL; computes results in JS by reading the records
 *   repository. The returned `QueryResult.sql` is null so callers can tell
 *   this came from the stub.
 *
 * For full natural-language support, set OPENAI_API_KEY and use the real
 * engine.
 */

import { RecordRepository } from '../db/RecordRepository';
import type { FieldMap, RecordRow, Schema } from '../db/schema';

import { formatAnswer } from './formatAnswer';
import type { AIQueryEngine, QueryRequest, QueryResult } from './types';

interface Aggregation {
  readonly kind: 'count' | 'biggest' | 'smallest' | 'average' | 'list';
  readonly fieldKey?: string;
  readonly speciesFilter?: string;
}

const SIZE_FIELD_HINTS: ReadonlyArray<string> = [
  'length_in',
  'length',
  'size',
  'price',
  'weight_lb',
];

function lowercase(s: string): string {
  return s.toLowerCase();
}

function findNumericField(schema: Schema | null, hint?: string): string | null {
  if (!schema) {
    return null;
  }
  if (hint) {
    const direct = schema.fields.find((f) => f.key === hint || f.label.toLowerCase() === hint);
    if (direct && direct.type === 'number') {
      return direct.key;
    }
  }
  for (const candidate of SIZE_FIELD_HINTS) {
    const match = schema.fields.find((f) => f.key === candidate && f.type === 'number');
    if (match) {
      return match.key;
    }
  }
  // Fall back to the first numeric field
  const firstNumeric = schema.fields.find((f) => f.type === 'number');
  return firstNumeric?.key ?? null;
}

function detectSpeciesFilter(question: string, schema: Schema | null): string | undefined {
  if (!schema) {
    return undefined;
  }
  const speciesField = schema.fields.find(
    (f) => f.key === 'species' || f.label.toLowerCase() === 'species',
  );
  if (!speciesField) {
    return undefined;
  }
  // crude: look for known fish nouns in the question
  const knownSpecies = ['perch', 'bass', 'pike', 'trout', 'walleye', 'crappie', 'catfish'];
  const lower = lowercase(question);
  for (const sp of knownSpecies) {
    if (lower.includes(sp)) {
      return sp;
    }
  }
  return undefined;
}

function classifyQuestion(q: string, schema: Schema | null): Aggregation {
  const lower = lowercase(q);
  const speciesFilter = detectSpeciesFilter(q, schema);

  if (lower.includes('how many') || lower.startsWith('count ') || lower.includes('number of')) {
    return { kind: 'count', speciesFilter };
  }
  if (lower.includes('biggest') || lower.includes('largest') || lower.includes('longest')) {
    return { kind: 'biggest', fieldKey: findNumericField(schema) ?? undefined, speciesFilter };
  }
  if (lower.includes('smallest') || lower.includes('shortest')) {
    return { kind: 'smallest', fieldKey: findNumericField(schema) ?? undefined, speciesFilter };
  }
  if (lower.includes('average') || lower.includes('mean')) {
    return { kind: 'average', fieldKey: findNumericField(schema) ?? undefined, speciesFilter };
  }
  return { kind: 'list', speciesFilter };
}

function fieldsMatchSpecies(fields: FieldMap, species: string | undefined): boolean {
  if (!species) {
    return true;
  }
  const value = fields.species;
  if (typeof value !== 'string') {
    return false;
  }
  return value.toLowerCase() === species.toLowerCase();
}

async function loadRecords(schemaId: string | null): Promise<readonly RecordRow[]> {
  if (schemaId) {
    return RecordRepository.findBySchema(schemaId);
  }
  return RecordRepository.findAll();
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string') {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function compute(
  agg: Aggregation,
  records: readonly RecordRow[],
  schema: Schema | null,
): ReadonlyArray<Record<string, unknown>> {
  const filtered = records.filter((r) => fieldsMatchSpecies(r.fields, agg.speciesFilter));

  if (agg.kind === 'count') {
    return [{ count: filtered.length }];
  }

  if ((agg.kind === 'biggest' || agg.kind === 'smallest') && agg.fieldKey) {
    const direction = agg.kind === 'biggest' ? -1 : 1;
    const ranked = [...filtered]
      .map((r) => ({ record: r, value: toNumber(r.fields[agg.fieldKey as string]) }))
      .filter((entry) => entry.value !== null)
      .sort((a, b) => {
        const av = a.value ?? 0;
        const bv = b.value ?? 0;
        return direction * (av - bv);
      });
    const top = ranked[0];
    if (!top) {
      return [];
    }
    const result: Record<string, unknown> = {};
    if (schema) {
      for (const field of schema.fields) {
        const v = top.record.fields[field.key];
        if (v !== undefined) {
          result[field.key] = v;
        }
      }
    } else {
      Object.assign(result, top.record.fields);
    }
    return [result];
  }

  if (agg.kind === 'average' && agg.fieldKey) {
    const values: number[] = [];
    for (const r of filtered) {
      const n = toNumber(r.fields[agg.fieldKey]);
      if (n !== null) {
        values.push(n);
      }
    }
    if (values.length === 0) {
      return [];
    }
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return [{ [`avg_${agg.fieldKey}`]: avg }];
  }

  // default: list
  return filtered.map((r) => {
    const out: Record<string, unknown> = {};
    Object.assign(out, r.fields);
    return out;
  });
}

export function createStubAIQueryEngine(): AIQueryEngine {
  async function answer(req: QueryRequest): Promise<QueryResult> {
    const start = Date.now();
    const records = await loadRecords(req.activeSchema?.id ?? null);
    const agg = classifyQuestion(req.question, req.activeSchema);
    const rows = compute(agg, records, req.activeSchema).map((r) => Object.freeze({ ...r }));
    const text = formatAnswer(req.question, rows, req.activeSchema);
    return Object.freeze({
      question: req.question,
      sql: null,
      rows,
      text,
      latencyMs: Date.now() - start,
    });
  }

  return { answer };
}
