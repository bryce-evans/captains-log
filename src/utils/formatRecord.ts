import type { FieldMap, RecordRow, Schema, SchemaField } from '@/db/schema';

/**
 * Pure formatting helpers shared by Logbook (Albums) and Record Detail.
 *
 * The screens are read-only, type-led views over RecordRow + Schema. These
 * helpers pick the title field, derive a humane subtitle, and format
 * timestamps in a journal voice — "Apr 18 · 6:42pm" — that matches the
 * "Soft Maritime Journal" direction in DESIGN.md.
 */

const FALLBACK_TITLE = 'Untitled entry';

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function pickTitleField(schema: Schema | null): SchemaField | null {
  if (!schema || schema.fields.length === 0) {
    return null;
  }
  const importantString = schema.fields.find((f) => f.important && f.type === 'string');
  if (importantString) {
    return importantString;
  }
  const firstImportant = schema.fields.find((f) => f.important);
  if (firstImportant) {
    return firstImportant;
  }
  return schema.fields[0] ?? null;
}

function formatFieldValue(value: unknown, field: SchemaField): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (field.type === 'number' && typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }
  return String(value);
}

export function getRecordTitle(record: RecordRow, schema: Schema | null): string {
  const titleField = pickTitleField(schema);
  if (titleField) {
    const raw = (record.fields as Readonly<Record<string, unknown>>)[titleField.key];
    const formatted = formatFieldValue(raw, titleField);
    if (formatted.length > 0) {
      return formatted;
    }
  }
  // Fall back to the first non-empty field on the record itself.
  const firstEntry = Object.entries(record.fields).find(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (firstEntry) {
    return String(firstEntry[1]);
  }
  return FALLBACK_TITLE;
}

interface SubtitlePart {
  readonly fieldKey: string;
  readonly value: string;
  readonly important: boolean;
}

function collectSubtitleParts(record: RecordRow, schema: Schema | null): SubtitlePart[] {
  if (!schema) {
    return [];
  }
  const titleField = pickTitleField(schema);
  const titleKey = titleField?.key;
  const fields = record.fields as Readonly<Record<string, unknown>>;
  const parts: SubtitlePart[] = [];
  for (const field of schema.fields) {
    if (field.key === titleKey) {
      continue;
    }
    const raw = fields[field.key];
    const formatted = formatFieldValue(raw, field);
    if (formatted.length === 0) {
      continue;
    }
    const decorated =
      field.type === 'number' && field.label.toLowerCase().includes('length')
        ? `${formatted}"`
        : formatted;
    parts.push({ fieldKey: field.key, value: decorated, important: field.important });
  }
  return parts;
}

const MAX_SUBTITLE_PARTS = 3;

export function getRecordSubtitle(record: RecordRow, schema: Schema | null): string {
  const parts = collectSubtitleParts(record, schema);
  if (parts.length === 0) {
    return '';
  }
  const important = parts.filter((p) => p.important);
  const ordered =
    important.length > 0 ? [...important, ...parts.filter((p) => !p.important)] : parts;
  return ordered
    .slice(0, MAX_SUBTITLE_PARTS)
    .map((p) => p.value)
    .join('  ·  ');
}

function formatHourMinute(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const meridiem = hours >= 12 ? 'pm' : 'am';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  const minuteStr = minutes.toString().padStart(2, '0');
  return `${display}:${minuteStr}${meridiem}`;
}

export function formatTimestamp(ms: number): string {
  if (!Number.isFinite(ms)) {
    return '';
  }
  const date = new Date(ms);
  const month = MONTH_SHORT[date.getMonth()] ?? '';
  const day = date.getDate();
  return `${month} ${day} · ${formatHourMinute(date)}`;
}

export interface RecordGroup {
  readonly key: string;
  readonly label: string;
  readonly records: readonly RecordRow[];
}

function monthKey(ms: number): { readonly key: string; readonly label: string } {
  const date = new Date(ms);
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const long = MONTH_LONG[monthIndex] ?? '';
  return {
    key: `${year}-${monthIndex.toString().padStart(2, '0')}`,
    label: `${long} ${year}`,
  };
}

/**
 * Group records by year-month, newest-first. Each group's `records` array
 * is also newest-first inside the group. Pure function — does not mutate
 * the input.
 */
export function groupByMonth(records: readonly RecordRow[]): readonly RecordGroup[] {
  const ordered = [...records].sort((a, b) => b.createdAt - a.createdAt);
  const buckets = new Map<string, { label: string; records: RecordRow[] }>();
  for (const record of ordered) {
    const { key, label } = monthKey(record.createdAt);
    const existing = buckets.get(key);
    if (existing) {
      existing.records.push(record);
    } else {
      buckets.set(key, { label, records: [record] });
    }
  }
  return Array.from(buckets.entries()).map(([key, { label, records: bucketRecords }]) =>
    Object.freeze({
      key,
      label,
      records: Object.freeze([...bucketRecords]),
    }),
  );
}

export interface LabelValuePair {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

/**
 * Vertical label/value list for the Record Detail screen — every non-empty
 * field except the one used as the page hero title.
 */
export function getRecordDetailPairs(
  record: RecordRow,
  schema: Schema | null,
): readonly LabelValuePair[] {
  if (!schema) {
    return [];
  }
  const titleField = pickTitleField(schema);
  const titleKey = titleField?.key;
  const fields = record.fields as Readonly<Record<string, unknown>>;
  const pairs: LabelValuePair[] = [];
  for (const field of schema.fields) {
    if (field.key === titleKey) {
      continue;
    }
    const raw = fields[field.key];
    const formatted = formatFieldValue(raw, field);
    if (formatted.length === 0) {
      continue;
    }
    pairs.push({ key: field.key, label: field.label, value: formatted });
  }
  return Object.freeze(pairs);
}

/**
 * Test seam — re-exported title field selector. Useful when the caller
 * wants to know whether a schema even has a usable title.
 */
export function selectTitleField(schema: Schema | null): SchemaField | null {
  return pickTitleField(schema);
}

export type { FieldMap };
