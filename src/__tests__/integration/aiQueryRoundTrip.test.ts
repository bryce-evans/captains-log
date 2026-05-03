/**
 * Integration: end-to-end AI query round-trip using StubAIQueryEngine
 * against the real seeded SQLite (in-memory test seam).
 *
 * Covers T008 acceptance: a sample AI query round-trip.
 *
 * The stub is used so tests don't depend on the network. The same code
 * path runs in dev when EXPO_PUBLIC_USE_AI_STUB === 'true' or no
 * OPENAI_API_KEY is configured.
 */
import { createStubAIQueryEngine } from '../../ai/StubAIQueryEngine';
import { resetDatabaseForTests } from '../../db/database';
import { RecordRepository } from '../../db/RecordRepository';
import { FISHING_SCHEMA_ID } from '../../db/seedSchemas';
import { resetSchemaRepositoryForTests, SchemaRepository } from '../../db/SchemaRepository';
import { resetActiveFakeDb } from '../../test/inMemoryDb';

describe('integration: AI query round-trip', () => {
  beforeEach(async () => {
    resetActiveFakeDb();
    resetDatabaseForTests();
    resetSchemaRepositoryForTests();
    await SchemaRepository.findAll(); // ensure seed
  });

  test('"how many records do I have" returns the total count', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 8 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 14 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'pike', length_in: 22 });

    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    expect(schema).not.toBeNull();

    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'how many records do I have',
      activeSchema: schema,
    });

    expect(result.rows).toEqual([{ count: 3 }]);
    // text is the bare scalar for single-row, single-column results
    expect(result.text).toContain('3');
    expect(result.sql).toBeNull();
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('"biggest fish" against the fishing schema returns the longest record', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 8 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'bass', length_in: 14 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'pike', length_in: 22 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'trout', length_in: 11 });

    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'biggest fish',
      activeSchema: schema,
    });

    expect(result.rows).toHaveLength(1);
    const top = result.rows[0];
    expect(top).toBeDefined();
    expect(top?.species).toBe('pike');
    expect(top?.length_in).toBe(22);
    expect(result.text).toContain('22');
  });

  test('"biggest perch" filters to the species before ranking', async () => {
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 8 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'perch', length_in: 13 });
    await RecordRepository.insert(FISHING_SCHEMA_ID, { species: 'pike', length_in: 22 });

    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'biggest perch I caught',
      activeSchema: schema,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.species).toBe('perch');
    expect(result.rows[0]?.length_in).toBe(13);
  });

  test('returns "No records found." when the database is empty', async () => {
    const schema = await SchemaRepository.findById(FISHING_SCHEMA_ID);
    const engine = createStubAIQueryEngine();
    const result = await engine.answer({
      question: 'biggest fish',
      activeSchema: schema,
    });

    expect(result.rows).toEqual([]);
    expect(result.text).toBe('No records found.');
  });
});
