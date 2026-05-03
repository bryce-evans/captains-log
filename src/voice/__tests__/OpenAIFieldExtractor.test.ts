import type { Schema } from '../../db/schema';
import { MVP_SEED_SCHEMAS } from '../../db/seedSchemas';
import {
  ExtractionMalformedError,
  ExtractionNetworkError,
  ExtractionTimeoutError,
} from '../errors';
import { OpenAIFieldExtractor, buildFunctionSchema } from '../extraction/OpenAIFieldExtractor';

const fishingSchema: Schema = {
  ...MVP_SEED_SCHEMAS[0]!,
  createdAt: 0,
};

function makeFetchOk(extracted: Record<string, unknown>): jest.Mock {
  return jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: 'record_fields',
                  arguments: JSON.stringify(extracted),
                },
              },
            ],
          },
        },
      ],
    }),
    text: async () => '',
  })) as unknown as jest.Mock;
}

describe('buildFunctionSchema', () => {
  test('maps schema fields to JSON-schema parameter types', () => {
    const fn = buildFunctionSchema(fishingSchema);
    expect(fn.name).toBe('record_fields');
    expect(fn.parameters.properties.species?.type).toBe('string');
    expect(fn.parameters.properties.length_in?.type).toBe('number');
    expect(fn.parameters.additionalProperties).toBe(false);
  });

  test('memoizes by schema id on a per-instance cache', () => {
    const extractor = new OpenAIFieldExtractor({ apiKey: 'k' });
    const a = extractor.buildFunctionSchema(fishingSchema);
    const b = extractor.buildFunctionSchema(fishingSchema);
    expect(a).toBe(b);
    // A second instance has its own cache — same shape, distinct identity.
    const other = new OpenAIFieldExtractor({ apiKey: 'k' });
    const c = other.buildFunctionSchema(fishingSchema);
    expect(c).not.toBe(a);
    expect(c).toEqual(a);
  });
});

describe('OpenAIFieldExtractor', () => {
  test('sends a chat-completions request with tool definition', async () => {
    const fetchImpl = makeFetchOk({ species: 'perch', length_in: 14 });
    const extractor = new OpenAIFieldExtractor({
      apiKey: 'test-key',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await extractor.extract({
      transcript: 'I caught a 14 inch perch',
      schema: fishingSchema,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const call = fetchImpl.mock.calls[0]!;
    const url = call[0] as string;
    const init = call[1] as { method: string; headers: Record<string, string>; body: string };
    expect(url).toContain('openai.com');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const parsedBody = JSON.parse(init.body) as {
      tools: Array<{ function: { name: string } }>;
      tool_choice: { function: { name: string } };
    };
    expect(parsedBody.tools[0]!.function.name).toBe('record_fields');
    expect(parsedBody.tool_choice.function.name).toBe('record_fields');
    expect(result.extracted.species).toBe('perch');
    expect(result.extracted.length_in).toBe(14);
  });

  test('filters null / unknown / n/a values', async () => {
    const fetchImpl = makeFetchOk({
      species: 'perch',
      length_in: null,
      location: 'unknown',
      notes: 'n/a',
      weight_lb: 4,
    });
    const extractor = new OpenAIFieldExtractor({
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const result = await extractor.extract({
      transcript: 'big perch',
      schema: fishingSchema,
    });
    expect(result.extracted).toEqual({ species: 'perch', weight_lb: 4 });
  });

  test('throws ExtractionNetworkError on non-2xx response', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => 'service unavailable',
      json: async () => ({}),
    })) as unknown as jest.Mock;
    const extractor = new OpenAIFieldExtractor({
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      extractor.extract({ transcript: 'hi', schema: fishingSchema }),
    ).rejects.toBeInstanceOf(ExtractionNetworkError);
  });

  test('throws ExtractionMalformedError when tool_calls missing', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: {} }] }),
      text: async () => '',
    })) as unknown as jest.Mock;
    const extractor = new OpenAIFieldExtractor({
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      extractor.extract({ transcript: 'hi', schema: fishingSchema }),
    ).rejects.toBeInstanceOf(ExtractionMalformedError);
  });

  test('throws ExtractionTimeoutError when fetch aborts', async () => {
    const fetchImpl = jest.fn(async (_url: string, init: { signal?: AbortSignal }) => {
      return await new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }) as unknown as jest.Mock;
    const extractor = new OpenAIFieldExtractor({
      apiKey: 'k',
      timeoutMs: 5,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      extractor.extract({ transcript: 'hi', schema: fishingSchema }),
    ).rejects.toBeInstanceOf(ExtractionTimeoutError);
  });

  test('throws ExtractionMalformedError when tool args are not JSON', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              tool_calls: [{ function: { name: 'record_fields', arguments: 'not-json' } }],
            },
          },
        ],
      }),
      text: async () => '',
    })) as unknown as jest.Mock;
    const extractor = new OpenAIFieldExtractor({
      apiKey: 'k',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(
      extractor.extract({ transcript: 'hi', schema: fishingSchema }),
    ).rejects.toBeInstanceOf(ExtractionMalformedError);
  });
});
