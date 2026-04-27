import { SQLiteDatabase } from 'expo-sqlite';

// Each entry is a forward-only migration. Never edit existing entries — append new ones.
const MIGRATIONS: string[] = [
  // v1 — initial schema
  `CREATE TABLE IF NOT EXISTS schemas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    log_label TEXT NOT NULL,
    fields_json TEXT NOT NULL,   -- JSON array of SchemaField
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    schema_id TEXT NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    photo_uri TEXT
  );

  CREATE TABLE IF NOT EXISTS record_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id TEXT NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    field_key TEXT NOT NULL,
    field_value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_records_schema ON records(schema_id);
  CREATE INDEX IF NOT EXISTS idx_record_fields_record ON record_fields(record_id);

  CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`,
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Find current version
  await db.execAsync(`CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);

  const row = await db.getFirstAsync<{ max_version: number | null }>(
    'SELECT MAX(version) as max_version FROM _migrations'
  );
  const currentVersion = row?.max_version ?? -1;

  for (let i = currentVersion + 1; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i]);
    await db.runAsync('INSERT INTO _migrations (version) VALUES (?)', [i]);
    console.log(`[db] migration v${i} applied`);
  }
}
