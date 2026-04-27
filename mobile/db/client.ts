import { openDatabaseAsync, SQLiteDatabase } from 'expo-sqlite';
import { runMigrations } from './migrations';

let _db: SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLiteDatabase> {
  if (_db) return _db;
  _db = await openDatabaseAsync('captains_log.db');
  await _db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations(_db);
  return _db;
}
