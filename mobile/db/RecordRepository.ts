import { getDb } from './client';
import { Record } from '../store';

interface RecordRow {
  id: string;
  schema_id: string;
  created_at: string;
  photo_uri: string | null;
}

interface FieldRow {
  field_key: string;
  field_value: string;
}

// Joins record + schema name/emoji from a pre-loaded schema map
async function rowToRecord(
  row: RecordRow,
  schemaMap: Map<string, { name: string; emoji: string }>
): Promise<Record> {
  const db = await getDb();
  const fieldRows = await db.getAllAsync<FieldRow>(
    'SELECT field_key, field_value FROM record_fields WHERE record_id = ? ORDER BY id',
    [row.id]
  );
  const fields: { [key: string]: string } = {};
  for (const f of fieldRows) fields[f.field_key] = f.field_value;

  const schema = schemaMap.get(row.schema_id);
  return {
    id: row.id,
    schemaId: row.schema_id,
    schemaName: schema?.name ?? row.schema_id,
    schemaEmoji: schema?.emoji ?? '📋',
    createdAt: row.created_at,
    fields,
    photoUri: row.photo_uri ?? undefined,
  };
}

export const RecordRepository = {
  async insert(record: Record): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO records (id, schema_id, created_at, photo_uri) VALUES (?, ?, ?, ?)',
        [record.id, record.schemaId, record.createdAt, record.photoUri ?? null]
      );
      for (const [key, value] of Object.entries(record.fields)) {
        await db.runAsync(
          'INSERT INTO record_fields (record_id, field_key, field_value) VALUES (?, ?, ?)',
          [record.id, key, value]
        );
      }
    });
  },

  async getAll(schemaMap: Map<string, { name: string; emoji: string }>): Promise<Record[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<RecordRow>(
      'SELECT * FROM records ORDER BY created_at DESC'
    );
    return Promise.all(rows.map((r) => rowToRecord(r, schemaMap)));
  },

  async getBySchema(
    schemaId: string,
    schemaMap: Map<string, { name: string; emoji: string }>
  ): Promise<Record[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<RecordRow>(
      'SELECT * FROM records WHERE schema_id = ? ORDER BY created_at DESC',
      [schemaId]
    );
    return Promise.all(rows.map((r) => rowToRecord(r, schemaMap)));
  },

  async attachPhoto(recordId: string, photoUri: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('UPDATE records SET photo_uri = ? WHERE id = ?', [photoUri, recordId]);
  },

  async delete(recordId: string): Promise<void> {
    const db = await getDb();
    // Cascades to record_fields via FK
    await db.runAsync('DELETE FROM records WHERE id = ?', [recordId]);
  },
};
