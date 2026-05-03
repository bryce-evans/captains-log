import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  readonly version: number;
  readonly description: string;
  readonly up: (db: SQLiteDatabase) => Promise<void>;
}

const initialMigration: Migration = {
  version: 1,
  description: 'create schemas and records tables',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS schemas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        definition_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS records (
        id TEXT PRIMARY KEY,
        schema_id TEXT NOT NULL REFERENCES schemas(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        audio_path TEXT,
        photo_paths_json TEXT,
        fields_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_records_schema ON records(schema_id);
      CREATE INDEX IF NOT EXISTS idx_records_created ON records(created_at);
    `);
  },
};

export const MIGRATIONS: readonly Migration[] = [initialMigration];

export async function applyMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>('SELECT version FROM _migrations');
  const appliedSet = new Set(applied.map((row) => row.version));

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) {
      continue;
    }
    await migration.up(db);
    await db.runAsync('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)', [
      migration.version,
      Date.now(),
    ]);
  }
}
