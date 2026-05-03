/**
 * Integration: bootstrap the database and verify the two MVP schemas seed
 * exactly once, even after a re-bootstrap.
 *
 * Covers T008 acceptance: the schema-seed half of the round-trip.
 */
import { bootstrapDatabase, resetDatabaseForTests } from '../../db/database';
import { ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID, MVP_SEED_SCHEMAS } from '../../db/seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../../db/SchemaRepository';
import { resetActiveFakeDb } from '../../test/inMemoryDb';

describe('integration: schema seed', () => {
  beforeEach(() => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
  });

  test('bootstrapping the DB seeds exactly the two MVP schemas', async () => {
    await bootstrapDatabase();
    const all = await SchemaRepository.findAll();
    expect(all).toHaveLength(MVP_SEED_SCHEMAS.length);
    expect(all).toHaveLength(2);

    const ids = all.map((s) => s.id).sort();
    expect(ids).toEqual([ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID].sort());
  });

  test('re-bootstrapping is idempotent — still exactly two schemas', async () => {
    await bootstrapDatabase();
    const first = await SchemaRepository.findAll();
    expect(first).toHaveLength(2);

    // Simulate an app re-launch with the same DB: reset the in-process
    // bootstrap caches but keep the underlying fake DB rows.
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();

    await bootstrapDatabase();
    const second = await SchemaRepository.findAll();
    expect(second).toHaveLength(2);

    const ids = second.map((s) => s.id).sort();
    expect(ids).toEqual([ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID].sort());
  });

  test('seeded fishing schema has expected important fields', async () => {
    await bootstrapDatabase();
    const fishing = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    expect(fishing).not.toBeNull();
    const importantKeys = (fishing?.fields ?? [])
      .filter((f) => f.important)
      .map((f) => f.key)
      .sort();
    expect(importantKeys).toEqual(['length_in', 'species']);
  });

  test('seeded art-show schema has expected important fields', async () => {
    await bootstrapDatabase();
    const artShow = await SchemaRepository.findById(ART_SHOW_SCHEMA_ID);
    expect(artShow).not.toBeNull();
    const importantKeys = (artShow?.fields ?? [])
      .filter((f) => f.important)
      .map((f) => f.key)
      .sort();
    expect(importantKeys).toEqual(['item', 'price']);
  });
});
