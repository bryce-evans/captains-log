import type { Schema, SchemaField } from '../db/schema';

const SQL_DIALECT_NOTES = `
You are translating a natural-language question into a single read-only SQLite
query. Constraints (very strict, the runtime will reject violations):

- Output JSON ONLY, of the shape {"sql": "..."}.
- The query MUST be a single SELECT (or CTE: WITH ... SELECT) statement.
- Do not emit any of: INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, PRAGMA,
  ATTACH, DETACH, VACUUM, REINDEX. Only SELECT.
- Do not include comments (no -- or /* */).
- Do not include trailing or extra semicolons.
- Only the tables \`records\` and \`schemas\` may be referenced.

Schema for the \`records\` table:
  id           TEXT PRIMARY KEY
  schema_id    TEXT
  created_at   INTEGER (unix epoch milliseconds)
  audio_path   TEXT
  photo_paths_json TEXT (JSON array)
  fields_json  TEXT (JSON object: field key -> field value)

Per-record field values are inside \`fields_json\`. Access them with
\`json_extract(fields_json, '$.<key>')\`. Numeric fields stored as JSON
numbers are returned as TEXT by json_extract; cast with CAST(... AS REAL)
when ordering or aggregating numerically.

When the user mentions a particular kind of record, filter by schema_id.
If the active schema is known, prefer filtering by it.`;

function describeField(field: SchemaField): string {
  const enumPart =
    field.type === 'enum' && field.enumValues && field.enumValues.length > 0
      ? ` (one of: ${field.enumValues.join(', ')})`
      : '';
  return `  - ${field.key}: ${field.type}${enumPart} -- ${field.label}`;
}

function describeSchema(schema: Schema): string {
  const lines = schema.fields.map(describeField);
  return `Schema id: ${schema.id}\nName: ${schema.name}\nFields:\n${lines.join('\n')}`;
}

const FISHING_EXAMPLES = `
Examples (Fishing schema, schema_id = 'mvp.fishing'):

Q: "biggest fish I caught"
A: {"sql":"SELECT json_extract(fields_json, '$.species') AS species, json_extract(fields_json, '$.length_in') AS length_in FROM records WHERE schema_id = 'mvp.fishing' ORDER BY CAST(json_extract(fields_json, '$.length_in') AS REAL) DESC LIMIT 1"}

Q: "how many perch did I catch"
A: {"sql":"SELECT COUNT(*) AS count FROM records WHERE schema_id = 'mvp.fishing' AND LOWER(json_extract(fields_json, '$.species')) = 'perch'"}

Q: "average length of bass"
A: {"sql":"SELECT AVG(CAST(json_extract(fields_json, '$.length_in') AS REAL)) AS avg_length FROM records WHERE schema_id = 'mvp.fishing' AND LOWER(json_extract(fields_json, '$.species')) = 'bass'"}
`;

const ART_SHOW_EXAMPLES = `
Examples (Art Show schema, schema_id = 'mvp.art_show'):

Q: "total sales"
A: {"sql":"SELECT SUM(CAST(json_extract(fields_json, '$.price') AS REAL)) AS total FROM records WHERE schema_id = 'mvp.art_show'"}
`;

export function buildSqlPrompt(activeSchema: Schema | null, recentSchemas: Schema[]): string {
  const sections: string[] = [SQL_DIALECT_NOTES.trim()];

  if (activeSchema) {
    sections.push(`Active schema (prefer filtering by this):\n${describeSchema(activeSchema)}`);
  }

  const others = recentSchemas.filter((s) => !activeSchema || s.id !== activeSchema.id);
  if (others.length > 0) {
    sections.push(`Other available schemas:\n${others.map((s) => describeSchema(s)).join('\n\n')}`);
  }

  sections.push(FISHING_EXAMPLES.trim());
  sections.push(ART_SHOW_EXAMPLES.trim());
  sections.push('Reply with ONLY the JSON object {"sql": "..."}. No prose, no markdown fences.');
  return sections.join('\n\n');
}
