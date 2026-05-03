import { v4 as uuidv4 } from 'uuid';

import { bootstrapDatabase } from './database';
import type { FieldMap, RecordPersistedRow, RecordRow } from './schema';
import { SchemaRepository } from './SchemaRepository';
import { SchemaValidationError, validateAgainstSchema } from './validateAgainstSchema';
import { deleteRecordFiles } from '../storage/FileStorageService';
import { logger } from '../utils/logger';

function parsePhotoPaths(raw: string | null): readonly string[] {
  if (!raw) {
    return Object.freeze([]);
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Object.freeze(parsed.filter((p): p is string => typeof p === 'string'));
    }
  } catch {
    // fall through
  }
  return Object.freeze([]);
}

function parseFields(raw: string): FieldMap {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const result: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))) {
          result[k] = v;
        }
      }
      return Object.freeze(result);
    }
  } catch {
    // fall through
  }
  return Object.freeze({});
}

function rowToRecord(row: RecordPersistedRow): RecordRow {
  return Object.freeze({
    id: row.id,
    schemaId: row.schema_id,
    createdAt: row.created_at,
    audioPath: row.audio_path,
    photoPaths: parsePhotoPaths(row.photo_paths_json),
    fields: parseFields(row.fields_json),
  });
}

async function findByIdInternal(id: string): Promise<RecordRow | null> {
  const db = await bootstrapDatabase();
  const row = await db.getFirstAsync<RecordPersistedRow>(
    'SELECT id, schema_id, created_at, audio_path, photo_paths_json, fields_json FROM records WHERE id = ?',
    [id],
  );
  return row ? rowToRecord(row) : null;
}

export const RecordRepository = {
  async insert(
    schemaId: string,
    fields: FieldMap,
    photoPaths: readonly string[] = [],
    audioPath: string | null = null,
  ): Promise<RecordRow> {
    const schema = await SchemaRepository.findById(schemaId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaId}`);
    }

    const validation = validateAgainstSchema(fields as Record<string, unknown>, schema);
    if (Object.keys(validation.rejected).length > 0) {
      throw new SchemaValidationError(
        `Validation failed for schema ${schemaId}`,
        validation.rejected,
      );
    }

    const db = await bootstrapDatabase();
    const id = uuidv4();
    const createdAt = Date.now();
    await db.runAsync(
      'INSERT INTO records (id, schema_id, created_at, audio_path, photo_paths_json, fields_json) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        schemaId,
        createdAt,
        audioPath,
        JSON.stringify([...photoPaths]),
        JSON.stringify(validation.accepted),
      ],
    );
    return Object.freeze({
      id,
      schemaId,
      createdAt,
      audioPath,
      photoPaths: Object.freeze([...photoPaths]),
      fields: validation.accepted,
    });
  },

  async findAll(): Promise<RecordRow[]> {
    const db = await bootstrapDatabase();
    const rows = await db.getAllAsync<RecordPersistedRow>(
      'SELECT id, schema_id, created_at, audio_path, photo_paths_json, fields_json FROM records ORDER BY created_at DESC',
    );
    return rows.map(rowToRecord);
  },

  async findBySchema(schemaId: string): Promise<RecordRow[]> {
    const db = await bootstrapDatabase();
    const rows = await db.getAllAsync<RecordPersistedRow>(
      'SELECT id, schema_id, created_at, audio_path, photo_paths_json, fields_json FROM records WHERE schema_id = ? ORDER BY created_at DESC',
      [schemaId],
    );
    return rows.map(rowToRecord);
  },

  async findById(id: string): Promise<RecordRow | null> {
    return findByIdInternal(id);
  },

  async attachPhoto(recordId: string, path: string): Promise<RecordRow> {
    const existing = await findByIdInternal(recordId);
    if (!existing) {
      throw new Error(`Record not found: ${recordId}`);
    }
    const nextPaths = Object.freeze([...existing.photoPaths, path]);
    const db = await bootstrapDatabase();
    await db.runAsync('UPDATE records SET photo_paths_json = ? WHERE id = ?', [
      JSON.stringify([...nextPaths]),
      recordId,
    ]);
    return Object.freeze({
      ...existing,
      photoPaths: nextPaths,
    });
  },

  async delete(id: string): Promise<void> {
    const db = await bootstrapDatabase();
    await db.runAsync('DELETE FROM records WHERE id = ?', [id]);
    try {
      await deleteRecordFiles(id);
    } catch (err) {
      // Don't fail the delete if file cleanup fails — log only.
      logger.warn('Failed to clean record files', err);
    }
  },
};
