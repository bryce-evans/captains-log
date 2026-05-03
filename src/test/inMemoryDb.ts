/**
 * Tiny in-memory stand-in for `expo-sqlite`'s SQLiteDatabase used during tests.
 *
 * This is NOT a SQL engine. It pattern-matches on the small set of SQL
 * statements emitted by the repositories and migrations in this project,
 * enough to round-trip the operations they depend on. If a new query shape
 * is added, extend the matchers below rather than reaching for a real SQLite.
 *
 * Tradeoff: real SQLite would catch SQL bugs, but expo-sqlite is a native
 * module and cannot run in jsdom without a full mock. Keeping this thin
 * is preferred over adding native test infra.
 */

interface SchemaRow {
  id: string;
  name: string;
  definition_json: string;
  created_at: number;
}

interface RecordRow {
  id: string;
  schema_id: string;
  created_at: number;
  audio_path: string | null;
  photo_paths_json: string | null;
  fields_json: string;
}

interface MigrationRow {
  version: number;
  applied_at: number;
}

type AnyRow = SchemaRow | RecordRow | MigrationRow;

interface InMemoryStore {
  schemas: Map<string, SchemaRow>;
  records: Map<string, RecordRow>;
  migrations: Map<number, MigrationRow>;
}

function createStore(): InMemoryStore {
  return {
    schemas: new Map(),
    records: new Map(),
    migrations: new Map(),
  };
}

function normalize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

export interface FakeSQLiteRunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface FakeSQLiteDatabase {
  databasePath: string;
  options: Record<string, unknown>;
  nativeDatabase: Record<string, never>;
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: ReadonlyArray<unknown>): Promise<FakeSQLiteRunResult>;
  getAllAsync<T>(source: string, params?: ReadonlyArray<unknown>): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: ReadonlyArray<unknown>): Promise<T | null>;
  closeAsync(): Promise<void>;
}

function asArray<T>(params: ReadonlyArray<unknown> | unknown): T[] {
  if (Array.isArray(params)) {
    return params as T[];
  }
  return [];
}

export function createFakeDatabase(): FakeSQLiteDatabase {
  const store = createStore();

  async function execAsync(source: string): Promise<void> {
    // Migrations issue multiple statements; we ignore CREATE TABLE/INDEX/PRAGMA
    // since the in-memory store has no schema constraints. This is intentional.
    const lower = source.toLowerCase();
    if (
      lower.includes('create table') ||
      lower.includes('create index') ||
      lower.includes('pragma')
    ) {
      return;
    }
    // No other exec patterns are expected.
  }

  async function runAsync(
    source: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<FakeSQLiteRunResult> {
    const sql = normalize(source);
    const args = asArray<unknown>(params);

    if (sql.startsWith('insert into _migrations')) {
      const [version, appliedAt] = args as [number, number];
      store.migrations.set(version, { version, applied_at: appliedAt });
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (sql.startsWith('insert into schemas')) {
      const [id, name, definitionJson, createdAt] = args as [string, string, string, number];
      store.schemas.set(id, {
        id,
        name,
        definition_json: definitionJson,
        created_at: createdAt,
      });
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (sql.startsWith('insert into records')) {
      const [id, schemaId, createdAt, audioPath, photoPathsJson, fieldsJson] = args as [
        string,
        string,
        number,
        string | null,
        string | null,
        string,
      ];
      // Enforce FK cascade behavior for tests: parent schema must exist.
      if (!store.schemas.has(schemaId)) {
        throw new Error(`FOREIGN KEY constraint failed: schema ${schemaId} not found`);
      }
      store.records.set(id, {
        id,
        schema_id: schemaId,
        created_at: createdAt,
        audio_path: audioPath,
        photo_paths_json: photoPathsJson,
        fields_json: fieldsJson,
      });
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (sql.startsWith('update records set photo_paths_json')) {
      const [photoPathsJson, recordId] = args as [string, string];
      const existing = store.records.get(recordId);
      if (existing) {
        store.records.set(recordId, { ...existing, photo_paths_json: photoPathsJson });
        return { lastInsertRowId: 0, changes: 1 };
      }
      return { lastInsertRowId: 0, changes: 0 };
    }

    if (sql.startsWith('delete from records where id')) {
      const [id] = args as [string];
      const existed = store.records.delete(id);
      return { lastInsertRowId: 0, changes: existed ? 1 : 0 };
    }

    if (sql.startsWith('delete from schemas where id')) {
      const [id] = args as [string];
      const existed = store.schemas.delete(id);
      // Cascade
      for (const [recordId, row] of store.records.entries()) {
        if (row.schema_id === id) {
          store.records.delete(recordId);
        }
      }
      return { lastInsertRowId: 0, changes: existed ? 1 : 0 };
    }

    throw new Error(`fake DB runAsync: unhandled SQL: ${sql}`);
  }

  async function getAllAsync<T>(source: string, params: ReadonlyArray<unknown> = []): Promise<T[]> {
    const sql = normalize(source);
    const args = asArray<unknown>(params);

    if (sql.startsWith('select version from _migrations')) {
      return Array.from(store.migrations.values()).map((m) => ({ version: m.version })) as T[];
    }

    if (
      sql.startsWith(
        'select id, name, definition_json, created_at from schemas order by created_at',
      )
    ) {
      const sorted = Array.from(store.schemas.values()).sort((a, b) => {
        if (a.created_at !== b.created_at) return a.created_at - b.created_at;
        return a.name.localeCompare(b.name);
      });
      return sorted as unknown as T[];
    }
    if (sql.startsWith('select id, name, definition_json, created_at from schemas order by name')) {
      const sorted = Array.from(store.schemas.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      return sorted as unknown as T[];
    }

    if (
      sql.startsWith(
        'select id, schema_id, created_at, audio_path, photo_paths_json, fields_json from records where schema_id',
      )
    ) {
      const [schemaId] = args as [string];
      const filtered = Array.from(store.records.values())
        .filter((r) => r.schema_id === schemaId)
        .sort((a, b) => b.created_at - a.created_at);
      return filtered as unknown as T[];
    }

    if (
      sql.startsWith(
        'select id, schema_id, created_at, audio_path, photo_paths_json, fields_json from records order by created_at desc',
      )
    ) {
      const sorted = Array.from(store.records.values()).sort((a, b) => b.created_at - a.created_at);
      return sorted as unknown as T[];
    }

    throw new Error(`fake DB getAllAsync: unhandled SQL: ${sql}`);
  }

  async function getFirstAsync<T>(
    source: string,
    params: ReadonlyArray<unknown> = [],
  ): Promise<T | null> {
    const sql = normalize(source);
    const args = asArray<unknown>(params);

    if (sql.startsWith('select id from schemas where id')) {
      const [id] = args as [string];
      const row = store.schemas.get(id);
      return row ? ({ id: row.id } as unknown as T) : null;
    }

    if (sql.startsWith('select id, name, definition_json, created_at from schemas where id')) {
      const [id] = args as [string];
      const row = store.schemas.get(id);
      return row ? (row as unknown as T) : null;
    }

    if (
      sql.startsWith(
        'select id, schema_id, created_at, audio_path, photo_paths_json, fields_json from records where id',
      )
    ) {
      const [id] = args as [string];
      const row = store.records.get(id);
      return row ? (row as unknown as T) : null;
    }

    throw new Error(`fake DB getFirstAsync: unhandled SQL: ${sql}`);
  }

  async function closeAsync(): Promise<void> {
    store.schemas.clear();
    store.records.clear();
    store.migrations.clear();
  }

  return {
    databasePath: ':memory:',
    options: {},
    nativeDatabase: {},
    execAsync,
    runAsync,
    getAllAsync,
    getFirstAsync,
    closeAsync,
  };
}

let activeFakeDb: FakeSQLiteDatabase | null = null;

export function getActiveFakeDb(): FakeSQLiteDatabase {
  if (!activeFakeDb) {
    activeFakeDb = createFakeDatabase();
  }
  return activeFakeDb;
}

export function resetActiveFakeDb(): void {
  activeFakeDb = createFakeDatabase();
}

export function clearActiveFakeDb(): void {
  activeFakeDb = null;
}

// Drop the unused helper warning — kept for future row-typing hooks.
export type { AnyRow };
