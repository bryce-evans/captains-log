import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { applyMigrations } from './migrations';

const DATABASE_NAME = 'captainslog.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;
let bootstrapPromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DATABASE_NAME);
  }
  return dbPromise;
}

export async function bootstrapDatabase(): Promise<SQLiteDatabase> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const db = await getDatabase();
      await applyMigrations(db);
      return db;
    })();
  }
  return bootstrapPromise;
}

export async function setDatabaseForTests(db: SQLiteDatabase): Promise<void> {
  dbPromise = Promise.resolve(db);
  bootstrapPromise = (async () => {
    await applyMigrations(db);
    return db;
  })();
  await bootstrapPromise;
}

export function resetDatabaseForTests(): void {
  dbPromise = null;
  bootstrapPromise = null;
}
