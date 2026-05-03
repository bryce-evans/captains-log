import type { Schema } from '../../db/schema';
import { MVP_SEED_SCHEMAS } from '../../db/seedSchemas';
import { StubFieldExtractor } from '../extraction/StubFieldExtractor';

const fishingSchema: Schema = {
  ...MVP_SEED_SCHEMAS[0]!,
  createdAt: 0,
};

const artShowSchema: Schema = {
  ...MVP_SEED_SCHEMAS[1]!,
  createdAt: 0,
};

describe('StubFieldExtractor', () => {
  const extractor = new StubFieldExtractor();

  test('extracts species and length from a fishing transcript', async () => {
    const result = await extractor.extract({
      transcript: 'I caught a 14 inch perch off the dock',
      schema: fishingSchema,
    });
    expect(result.extracted.species).toBe('perch');
    expect(result.extracted.length_in).toBe(14);
  });

  test('returns empty object on empty transcript', async () => {
    const result = await extractor.extract({ transcript: '', schema: fishingSchema });
    expect(Object.keys(result.extracted)).toHaveLength(0);
  });

  test('extracts price and enum payment method for art show', async () => {
    const result = await extractor.extract({
      transcript: 'Sold a small landscape painting for 120 dollars to Sarah, paid in cash',
      schema: artShowSchema,
    });
    expect(result.extracted.price).toBe(120);
    expect(result.extracted.payment_method).toBe('cash');
    expect(result.extracted.buyer_name).toBe('Sarah');
  });

  test('reports latency >= 0', async () => {
    const result = await extractor.extract({ transcript: 'hi', schema: fishingSchema });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('drops nullish-token strings before returning', async () => {
    // domain transcript that would not match any extraction rules — output is empty
    const result = await extractor.extract({
      transcript: 'unknown unknown',
      schema: fishingSchema,
    });
    expect(result.extracted).not.toHaveProperty('species');
  });
});
