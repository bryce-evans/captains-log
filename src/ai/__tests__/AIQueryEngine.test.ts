import { resetDatabaseForTests } from '../../db/database';
import { RecordRepository } from '../../db/RecordRepository';
import { FISHING_SCHEMA_ID } from '../../db/seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../../db/SchemaRepository';
import { resetActiveFakeDb } from '../../test/inMemoryDb';
import { createStubAIQueryEngine } from '../StubAIQueryEngine';

describe('StubAIQueryEngine', () => {
  beforeEach(async () => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
    await SchemaRepository.findAll();
  });

  it('answers a "how many" count query', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 8 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 9 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 12 });

    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    expect(schema).not.toBeNull();

    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'how many perch did I catch?',
      activeSchema: schema,
    });

    expect(result.rows).toEqual([{ count: 2 }]);
    expect(result.text).toBe('2');
    expect(result.sql).toBeNull();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('answers a "biggest" aggregation query', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 14 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 17 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 9 });

    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'biggest bass I caught',
      activeSchema: schema,
    });

    expect(result.rows).toHaveLength(1);
    const top = result.rows[0];
    expect(top).toBeDefined();
    expect(top?.species).toBe('bass');
    expect(top?.length_in).toBe(17);
    expect(result.text).toContain('17');
  });

  it('returns "No records found." for an empty database', async () => {
    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'biggest fish',
      activeSchema: schema,
    });
    expect(result.rows).toEqual([]);
    expect(result.text).toBe('No records found.');
  });

  it('computes an average across matching records', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 10 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 20 });

    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'average length of bass',
      activeSchema: schema,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.avg_length_in).toBe(15);
  });
});
