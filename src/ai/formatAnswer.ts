import type { Schema, SchemaField } from '../db/schema';

const MAX_LISTED_ROWS = 5;

function findFieldLabel(schema: Schema | null, key: string): string {
  if (!schema) {
    return key;
  }
  const field: SchemaField | undefined = schema.fields.find((f) => f.key === key);
  return field?.label ?? key;
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return JSON.stringify(value);
}

function formatRow(row: Record<string, unknown>, schema: Schema | null): string {
  const entries = Object.entries(row);
  const parts = entries.map(([k, v]) => `${findFieldLabel(schema, k)}: ${formatScalar(v)}`);
  return parts.join(', ');
}

/**
 * Convert SQL result rows into a short human-readable answer string.
 *
 * Heuristic:
 * - 0 rows -> "No records found."
 * - 1 row, 1 column -> bare value (e.g., "12")
 * - 1 row, multi-col -> "Label: value, Label: value"
 * - n rows -> "n records: row1; row2; ..." (capped at MAX_LISTED_ROWS)
 *
 * The `question` parameter is currently unused but is part of the engine
 * contract so callers can pass it through; it's kept for future heuristics
 * (e.g. detecting "how many" or "biggest" to tweak phrasing).
 */
export function formatAnswer(
  _question: string,
  rows: ReadonlyArray<Record<string, unknown>>,
  schema: Schema | null,
): string {
  if (rows.length === 0) {
    return 'No records found.';
  }

  if (rows.length === 1) {
    const row = rows[0];
    if (!row) {
      return 'No records found.';
    }
    const keys = Object.keys(row);
    if (keys.length === 1) {
      const onlyKey = keys[0];
      if (onlyKey !== undefined) {
        return formatScalar(row[onlyKey]);
      }
    }
    return formatRow(row, schema);
  }

  const previewRows = rows.slice(0, MAX_LISTED_ROWS);
  const remaining = rows.length - previewRows.length;
  const lines = previewRows.map((r) => formatRow(r, schema));
  const summary = `${rows.length} records`;
  const tail = remaining > 0 ? ` (+${remaining} more)` : '';
  return `${summary}: ${lines.join('; ')}${tail}`;
}
