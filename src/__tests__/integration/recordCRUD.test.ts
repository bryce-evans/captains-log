/**
 * Integration: end-to-end record CRUD through RecordRepository, including
 * photo attachment and FK cascade on schema delete.
 *
 * Covers T008 acceptance: the record CRUD half of the round-trip.
 */
import { resetDatabaseForTests } from '../../db/database';
import { RecordRepository } from '../../db/RecordRepository';
import { ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID } from '../../db/seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../../db/SchemaRepository';
import { resetActiveFakeDb } from '../../test/inMemoryDb';

const fileSystemMock = require('expo-file-system/legacy') as {
  __reset?: () => void;
};

describe('integration: record CRUD', () => {
  beforeEach(async () => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
    fileSystemMock.__reset?.();
    // Trigger seed so schemas exist before any record op.
    await SchemaRepository.findAll();
  });

  test('insert → findById round-trips fields, schemaId, and defaults', async () => {
    const inserted = await RecordRepository.insert(FISHING_SCHEMA_ID, {
      species: 'perch',
      length_in: 12,
    });

    const fetched = await RecordRepository.findById(inserted.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(inserted.id);
    expect(fetched?.schemaId).toBe(FISHING_SCHEMA_ID);
    expect(fetched?.fields).toEqual({ species: 'perch', length_in: 12 });
    expect(fetched?.photoPaths).toEqual([]);
    expect(fetched?.audioPath).toBeNull();
  });

  test('findBySchema returns only records for that schema', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 8 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 14 });
    await RecordRepository.insert(ART_SHOW_SCHEMA_ID, { item: 'print', price: 45 });

    const fishing = await RecordRepository.findBySchema(FISHING_SCHEMA_ID);
    const artShow = await RecordRepository.findBySchema(ART_SHOW_SCHEMA_ID);

    expect(fishing).toHaveLength(2);
    expect(artShow).toHaveLength(1);
    expect(artShow[0]?.fields.item).toBe('print');
  });

  test('findAll returns every record across schemas, newest-first', async () => {
    const first = await RecordRepository.insert(FISHING_SCHEMA_ID, {
      species: 'perch',
      length_in: 9,
    });
    // ensure created_at differs by a tick so ordering is deterministic
    await new Promise<void>((resolve) => setTimeout(resolve, 2));
    const second = await RecordRepository.insert(ART_SHOW_SCHEMA_ID, {
      item: 'sketch',
      price: 30,
    });

    const all = await RecordRepository.findAll();
    expect(all).toHaveLength(2);
    expect(all[0]?.id).toBe(second.id);
    expect(all[1]?.id).toBe(first.id);
  });

  test('attachPhoto appends to photoPaths and persists', async () => {
    const inserted = await RecordRepository.insert(
      FISHING_SCHEMA_ID,
      { species: 'trout', length_in: 11 },
      ['file:///records/seed/photo_0.jpg'],
    );
    const after = await RecordRepository.attachPhoto(
      inserted.id,
      'file:///records/seed/photo_1.jpg',
    );
    expect(after.photoPaths).toEqual([
      'file:///records/seed/photo_0.jpg',
      'file:///records/seed/photo_1.jpg',
    ]);

    const refetched = await RecordRepository.findById(inserted.id);
    expect(refetched?.photoPaths).toEqual([
      'file:///records/seed/photo_0.jpg',
      'file:///records/seed/photo_1.jpg',
    ]);
  });

  test('deleting the parent schema cascades to its records', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'pike', length_in: 18 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 12 });
    await RecordRepository.insert(ART_SHOW_SCHEMA_ID, { item: 'mug', price: 22 });

    await SchemaRepository.delete(FISHING_SCHEMA_ID);

    const remaining = await RecordRepository.findAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.schemaId).toBe(ART_SHOW_SCHEMA_ID);

    // direct lookups by schema also reflect the cascade
    const fishing = await RecordRepository.findBySchema(FISHING_SCHEMA_ID);
    expect(fishing).toEqual([]);
  });

  test('delete removes a single record without touching siblings', async () => {
    const a = await RecordRepository.insert(FISHING_SCHEMA_ID, {
      species: 'walleye',
      length_in: 16,
    });
    const b = await RecordRepository.insert(FISHING_SCHEMA_ID, {
      species: 'crappie',
      length_in: 9,
    });

    await RecordRepository.delete(a.id);

    expect(await RecordRepository.findById(a.id)).toBeNull();
    expect(await RecordRepository.findById(b.id)).not.toBeNull();
  });
});
