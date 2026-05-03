import type { Schema } from '../../db/schema';
import { formatAnswer } from '../formatAnswer';

const fishingSchema: Schema = Object.freeze({
  id: 'mvp.fishing',
  name: 'Fishing',
  createdAt: 0,
  fields: [
    { key: 'species', label: 'Species', type: 'string' as const, important: true },
    { key: 'length_in', label: 'Length (in)', type: 'number' as const, important: true },
    { key: 'weight_lb', label: 'Weight (lb)', type: 'number' as const, important: false },
  ],
});

describe('formatAnswer', () => {
  it('returns "No records found." for empty rows', () => {
    expect(formatAnswer('how many?', [], fishingSchema)).toBe('No records found.');
  });

  it('returns the bare scalar for a single 1-column row', () => {
    expect(formatAnswer('how many?', [{ count: 7 }], fishingSchema)).toBe('7');
  });

  it('returns labeled "k: v, k: v" for a single multi-col row', () => {
    const text = formatAnswer('biggest fish', [{ species: 'bass', length_in: 17 }], fishingSchema);
    expect(text).toContain('Species: bass');
    expect(text).toContain('Length (in): 17');
  });

  it('summarizes multiple rows with a count prefix', () => {
    const text = formatAnswer(
      'list fish',
      [
        { species: 'bass', length_in: 17 },
        { species: 'perch', length_in: 9 },
      ],
      fishingSchema,
    );
    expect(text.startsWith('2 records')).toBe(true);
    expect(text).toContain('Species: bass');
    expect(text).toContain('Species: perch');
  });

  it('rounds non-integer numbers to two decimals', () => {
    expect(formatAnswer('avg', [{ avg_length_in: 12.345 }], fishingSchema)).toBe('12.35');
  });

  it('falls back to the raw key when schema is null', () => {
    expect(formatAnswer('q', [{ species: 'bass', length_in: 10 }], null)).toContain(
      'species: bass',
    );
  });
});
