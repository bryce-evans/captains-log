import { resetDatabaseForTests } from '../database';
import { RecordRepository } from '../RecordRepository';
import { ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID } from '../seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../SchemaRepository';
import { SchemaValidationError } from '../validateAgainstSchema';

import { resetActiveFakeDb } from '../../test/inMemoryDb';

describe('RecordRepository', () => {
  beforeEach(async () => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
    // Seed schemas before each test
    await SchemaRepository.findAll();
  });

  it('inserts a record with valid fields and round-trips it', async () => {
    const inserted = await RecordRepository.insert(FISHING_SCHEMA_ID, {
      species: 'perch',
      length_in: 12,
    });
    expect(inserted.id).toBeTruthy();
    const found = await RecordRepository.findById(inserted.id);
    expect(found?.fields).toEqual({ species: 'perch', length_in: 12 });
    expect(found?.schemaId).toBe(FISHING_SCHEMA_ID);
    expect(found?.photoPaths).toEqual([]);
    expect(found?.audioPath).toBeNull();
  });

  it('rejects insert when a field has the wrong type', async () => {
    await expect(
      RecordRepository.insert(FISHING_SCHEMA_ID, { length_in: 'ABC' as unknown as number }),
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('coerces string numerics on insert', async () => {
    const inserted = await RecordRepository.insert(FISHING_SCHEMA_ID, {
      length_in: '14' as unknown as number,
      species: 'bass',
    });
    expect(inserted.fields).toEqual({ length_in: 14, species: 'bass' });
  });

  it('findAll returns records sorted by created_at DESC', async () => {
    const a = await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'a', length_in: 1 });
    // ensure created_at differs by a tick
    await new Promise((r) => setTimeout(r, 2));
    const b = await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'b', length_in: 2 });
    const all = await RecordRepository.findAll();
    expect(all[0]?.id).toBe(b.id);
    expect(all[1]?.id).toBe(a.id);
  });

  it('findBySchema filters records by schemaId', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 8 });
    await RecordRepository.insert(ART_SHOW_SCHEMA_ID, { item: 'print', price: 30 });
    const fishOnly = await RecordRepository.findBySchema(FISHING_SCHEMA_ID);
    expect(fishOnly).toHaveLength(1);
    expect(fishOnly[0]?.fields.species).toBe('perch');
  });

  it('attachPhoto appends to photoPaths without overwriting', async () => {
    const inserted = await RecordRepository.insert(
      FISHING_SCHEMA_ID,
      {
        species: 'trout',
        length_in: 10,
      },
      ['file:///a.jpg'],
    );
    const after = await RecordRepository.attachPhoto(inserted.id, 'file:///b.jpg');
    expect(after.photoPaths).toEqual(['file:///a.jpg', 'file:///b.jpg']);
    const fetched = await RecordRepository.findById(inserted.id);
    expect(fetched?.photoPaths).toEqual(['file:///a.jpg', 'file:///b.jpg']);
  });

  it('drops unknown fields and inserts the rest', async () => {
    const inserted = await RecordRepository.insert(FISHING_SCHEMA_ID, {
      species: 'pike',
      length_in: 22,
      not_a_field: 'x' as unknown as string,
    } as Record<string, string | number>);
    expect(inserted.fields).toEqual({ species: 'pike', length_in: 22 });
  });
});
