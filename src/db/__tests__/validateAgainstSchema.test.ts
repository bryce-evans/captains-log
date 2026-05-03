import type { Schema, SchemaField } from '../schema';
import { validateAgainstSchema } from '../validateAgainstSchema';

const fields: readonly SchemaField[] = [
  { key: 'species', label: 'Species', type: 'string', important: true },
  { key: 'length_in', label: 'Length', type: 'number', important: true },
  { key: 'weight_lb', label: 'Weight', type: 'number', important: false },
  { key: 'notes', label: 'Notes', type: 'string', important: false },
  {
    key: 'method',
    label: 'Method',
    type: 'enum',
    important: false,
    enumValues: ['fly', 'spinner', 'bait'],
  },
];

const fishingSchema: Schema = Object.freeze({
  id: 'mvp.fishing',
  name: 'Fishing',
  createdAt: 0,
  fields,
});

describe('validateAgainstSchema', () => {
  it('coerces stringified numbers into numbers', () => {
    const result = validateAgainstSchema({ length_in: '12' }, fishingSchema);
    expect(result.accepted).toEqual({ length_in: 12 });
    expect(result.rejected).toEqual({});
  });

  it('rejects non-numeric strings for number fields', () => {
    const result = validateAgainstSchema({ length_in: 'twelve' }, fishingSchema);
    expect(result.accepted).toEqual({});
    expect(result.rejected.length_in).toBeDefined();
    expect(result.rejected.length_in?.reason).toBe('not_a_number');
  });

  it('drops empty strings as "not mentioned"', () => {
    const result = validateAgainstSchema(
      { species: '', length_in: '   ', notes: '' },
      fishingSchema,
    );
    expect(result.accepted).toEqual({});
    expect(result.rejected).toEqual({});
  });

  it('drops null-stringy GPT placeholders', () => {
    const result = validateAgainstSchema(
      { species: 'null', length_in: 'unknown', notes: 'N/A', weight_lb: 'none' },
      fishingSchema,
    );
    expect(result.accepted).toEqual({});
    expect(result.rejected).toEqual({});
  });

  it('drops fields that are not in the schema', () => {
    const result = validateAgainstSchema({ species: 'perch', not_a_field: 'x' }, fishingSchema);
    expect(result.accepted).toEqual({ species: 'perch' });
    expect(result.rejected).toEqual({});
  });

  it('normalizes enum values case-insensitively to lowercase', () => {
    const result = validateAgainstSchema({ method: 'Fly' }, fishingSchema);
    expect(result.accepted).toEqual({ method: 'fly' });
  });

  it('rejects enum values that do not match', () => {
    const result = validateAgainstSchema({ method: 'lure' }, fishingSchema);
    expect(result.rejected.method?.reason).toBe('not_in_enum');
  });

  it('allows negative numbers', () => {
    const result = validateAgainstSchema({ length_in: -10, weight_lb: '-3.5' }, fishingSchema);
    expect(result.accepted).toEqual({ length_in: -10, weight_lb: -3.5 });
  });

  it('drops null and undefined values silently', () => {
    const result = validateAgainstSchema(
      { species: null, length_in: undefined, notes: 'good day' },
      fishingSchema,
    );
    expect(result.accepted).toEqual({ notes: 'good day' });
    expect(result.rejected).toEqual({});
  });

  it('coerces numeric strings with whitespace', () => {
    const result = validateAgainstSchema({ length_in: '  14  ' }, fishingSchema);
    expect(result.accepted).toEqual({ length_in: 14 });
  });
});
