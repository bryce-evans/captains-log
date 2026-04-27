import { getDb } from './client';
import { Schema } from '../store';

interface SchemaRow {
  id: string;
  name: string;
  emoji: string;
  log_label: string;
  fields_json: string;
  created_at: string;
}

function rowToSchema(row: SchemaRow): Schema {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    logLabel: row.log_label,
    fields: JSON.parse(row.fields_json),
  };
}

export const SchemaRepository = {
  async getAll(): Promise<Schema[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<SchemaRow>('SELECT * FROM schemas ORDER BY created_at');
    return rows.map(rowToSchema);
  },

  async getById(id: string): Promise<Schema | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<SchemaRow>('SELECT * FROM schemas WHERE id = ?', [id]);
    return row ? rowToSchema(row) : null;
  },

  async upsert(schema: Schema): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO schemas (id, name, emoji, log_label, fields_json)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         emoji = excluded.emoji,
         log_label = excluded.log_label,
         fields_json = excluded.fields_json`,
      [schema.id, schema.name, schema.emoji, schema.logLabel, JSON.stringify(schema.fields)]
    );
  },

  async seed(schemas: Schema[]): Promise<void> {
    for (const s of schemas) {
      const existing = await this.getById(s.id);
      if (!existing) await this.upsert(s);
    }
  },
};
