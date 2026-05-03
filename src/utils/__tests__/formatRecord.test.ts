import {
  formatTimestamp,
  getRecordDetailPairs,
  getRecordSubtitle,
  getRecordTitle,
  groupByMonth,
} from '../formatRecord';

import type { RecordRow, Schema, SchemaField } from '@/db/schema';

const FISHING_FIELDS: readonly SchemaField[] = [
  { key: 'species', label: 'Species', type: 'string', important: true },
  { key: 'length_in', label: 'Length (in)', type: 'number', important: true },
  { key: 'weight_lb', label: 'Weight (lb)', type: 'number', important: false },
  { key: 'location', label: 'Location', type: 'string', important: false },
  { key: 'notes', label: 'Notes', type: 'string', important: false },
];

const FISHING_SCHEMA: Schema = {
  id: 'mvp.fishing',
  name: 'Fishing',
  createdAt: 1_700_000_000_000,
  fields: FISHING_FIELDS,
};

function makeRecord(overrides: Partial<RecordRow> = {}): RecordRow {
  return Object.freeze({
    id: 'rec-1',
    schemaId: FISHING_SCHEMA.id,
    createdAt: new Date('2026-04-18T18:42:00').getTime(),
    audioPath: null,
    photoPaths: Object.freeze([]),
    fields: Object.freeze({
      species: 'Perch',
      length_in: 14,
      location: 'Cherry Cove dock',
    }),
    ...overrides,
  });
}

describe('getRecordTitle', () => {
  test('uses the first important string field as title', () => {
    const record = makeRecord();
    expect(getRecordTitle(record, FISHING_SCHEMA)).toBe('Perch');
  });

  test('falls back to first non-empty field when no schema-matched value exists', () => {
    const record = makeRecord({
      fields: Object.freeze({ length_in: 9, location: 'Pier' }),
    });
    expect(getRecordTitle(record, FISHING_SCHEMA)).toBe('9');
  });

  test('returns Untitled entry when record has no fields', () => {
    const record = makeRecord({ fields: Object.freeze({}) });
    expect(getRecordTitle(record, FISHING_SCHEMA)).toBe('Untitled entry');
  });

  test('returns Untitled entry when schema is null and fields are empty', () => {
    const record = makeRecord({ fields: Object.freeze({}) });
    expect(getRecordTitle(record, null)).toBe('Untitled entry');
  });
});

describe('getRecordSubtitle', () => {
  test('joins remaining fields with thin separator and decorates length', () => {
    const subtitle = getRecordSubtitle(makeRecord(), FISHING_SCHEMA);
    expect(subtitle).toBe('14"  ·  Cherry Cove dock');
  });

  test('returns empty string when no other fields are present', () => {
    const record = makeRecord({ fields: Object.freeze({ species: 'Bass' }) });
    expect(getRecordSubtitle(record, FISHING_SCHEMA)).toBe('');
  });

  test('returns empty string when schema is null', () => {
    expect(getRecordSubtitle(makeRecord(), null)).toBe('');
  });
});

describe('formatTimestamp', () => {
  test('formats afternoon time with pm meridiem and short month', () => {
    const ms = new Date('2026-04-18T18:42:00').getTime();
    expect(formatTimestamp(ms)).toBe('Apr 18 · 6:42pm');
  });

  test('formats midnight as 12:00am', () => {
    const ms = new Date('2026-01-01T00:00:00').getTime();
    expect(formatTimestamp(ms)).toBe('Jan 1 · 12:00am');
  });

  test('returns empty string for non-finite timestamps', () => {
    expect(formatTimestamp(Number.NaN)).toBe('');
  });
});

describe('groupByMonth', () => {
  test('groups records by year-month newest-first', () => {
    const records: readonly RecordRow[] = Object.freeze([
      makeRecord({ id: 'a', createdAt: new Date('2026-04-18T10:00:00').getTime() }),
      makeRecord({ id: 'b', createdAt: new Date('2026-04-02T10:00:00').getTime() }),
      makeRecord({ id: 'c', createdAt: new Date('2026-03-30T10:00:00').getTime() }),
    ]);
    const groups = groupByMonth(records);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe('April 2026');
    expect(groups[0]?.records.map((r) => r.id)).toEqual(['a', 'b']);
    expect(groups[1]?.label).toBe('March 2026');
    expect(groups[1]?.records.map((r) => r.id)).toEqual(['c']);
  });

  test('returns an empty array for an empty input', () => {
    expect(groupByMonth([])).toEqual([]);
  });
});

describe('getRecordDetailPairs', () => {
  test('emits label/value pairs for non-title, non-empty fields', () => {
    const pairs = getRecordDetailPairs(makeRecord(), FISHING_SCHEMA);
    const labels = pairs.map((p) => p.label);
    expect(labels).toEqual(['Length (in)', 'Location']);
  });

  test('returns empty array when schema is null', () => {
    expect(getRecordDetailPairs(makeRecord(), null)).toEqual([]);
  });
});
