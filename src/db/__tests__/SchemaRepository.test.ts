import { resetDatabaseForTests } from '../database';
import { ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID } from '../seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../SchemaRepository';

import { resetActiveFakeDb } from '../../test/inMemoryDb';

describe('SchemaRepository', () => {
  beforeEach(() => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
  });

  it('seeds the two MVP schemas on first call', async () => {
    const all = await SchemaRepository.findAll();
    const ids = all.map((s) => s.id).sort();
    expect(ids).toEqual([ART_SHOW_SCHEMA_ID, FISHING_SCHEMA_ID].sort());
  });

  it('does not duplicate seeds across calls', async () => {
    const first = await SchemaRepository.findAll();
    resetSchemaRepositoryForTests(); // simulate fresh app boot but shared DB
    const second = await SchemaRepository.findAll();
    expect(second).toHaveLength(first.length);
    expect(second.length).toBe(2);
  });

  it('findById returns the seeded fishing schema', async () => {
    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    expect(schema).not.toBeNull();
    expect(schema?.name).toBe('Fishing');
    expect(schema?.fields.find((f) => f.key === 'species')?.important).toBe(true);
  });

  it('findById returns null for unknown schema', async () => {
    const schema = await SchemaRepository.findById('does-not-exist');
    expect(schema).toBeNull();
  });

  it('create persists a new schema', async () => {
    const created = await SchemaRepository.create({
      name: 'Birding',
      fields: [{ key: 'species', label: 'Species', type: 'string', important: true }],
    });
    expect(created.id).toBeTruthy();
    const fetched = await SchemaRepository.findById(created.id);
    expect(fetched?.name).toBe('Birding');
  });

  it('delete removes a schema', async () => {
    const created = await SchemaRepository.create({
      name: 'Temp',
      fields: [{ key: 'a', label: 'A', type: 'string', important: false }],
    });
    await SchemaRepository.delete(created.id);
    const fetched = await SchemaRepository.findById(created.id);
    expect(fetched).toBeNull();
  });
});
