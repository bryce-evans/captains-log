import type { Schema, SchemaField } from '../../db/schema';
import {
  ExtractionMalformedError,
  ExtractionNetworkError,
  ExtractionTimeoutError,
} from '../errors';

import { filterNullish } from './FieldExtractor';
import type { ExtractionInput, ExtractionResult, FieldExtractor } from './types';

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

interface FunctionParameterSchema {
  readonly type: string;
  readonly description?: string;
  readonly enum?: readonly string[];
}

interface FunctionSchema {
  readonly name: string;
  readonly description: string;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Readonly<Record<string, FunctionParameterSchema>>;
    readonly additionalProperties: false;
  };
}

interface OpenAIChatResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: {
      readonly tool_calls?: ReadonlyArray<{
        readonly function?: {
          readonly name?: string;
          readonly arguments?: string;
        };
      }>;
    };
  }>;
  readonly error?: { readonly message?: string };
}

export interface OpenAIFieldExtractorOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly endpoint?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

function fieldToParameter(field: SchemaField): FunctionParameterSchema {
  if (field.type === 'number') {
    return {
      type: 'number',
      description: `${field.label}${field.important ? ' (important)' : ''}`,
    };
  }
  if (field.type === 'enum') {
    return {
      type: 'string',
      enum: field.enumValues ?? [],
      description: `${field.label}${field.important ? ' (important)' : ''}`,
    };
  }
  return {
    type: 'string',
    description: `${field.label}${field.important ? ' (important)' : ''}`,
  };
}

/**
 * Pure builder used in tests to validate the JSON-schema shape we send to
 * OpenAI. The actual extractor caches per-instance via
 * `OpenAIFieldExtractor.buildFunctionSchema`.
 */
export function buildFunctionSchema(schema: Schema): FunctionSchema {
  const properties: Record<string, FunctionParameterSchema> = {};
  for (const field of schema.fields) {
    properties[field.key] = fieldToParameter(field);
  }
  return {
    name: 'record_fields',
    description: `Extract values for the "${schema.name}" record. Only include fields the user actually mentioned. Use null when unsure.`,
    parameters: {
      type: 'object',
      properties,
      additionalProperties: false,
    },
  };
}

export class OpenAIFieldExtractor implements FieldExtractor {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  // Per-instance schema cache. Keyed on schema id so a "duplicate-on-edit"
  // schema rev (different id) gets a fresh entry. Eliminating the previous
  // module-level singleton prevents test pollution and lets multiple
  // extractor instances coexist with isolated state.
  private readonly schemaCache = new Map<string, FunctionSchema>();

  constructor(options: OpenAIFieldExtractorOptions) {
    if (!options.apiKey) {
      throw new ExtractionNetworkError('OpenAI API key is required');
    }
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  buildFunctionSchema(schema: Schema): FunctionSchema {
    const cached = this.schemaCache.get(schema.id);
    if (cached) {
      return cached;
    }
    const next = buildFunctionSchema(schema);
    this.schemaCache.set(schema.id, next);
    return next;
  }

  clearSchemaCache(): void {
    this.schemaCache.clear();
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const startedAt = Date.now();
    const fnSchema = this.buildFunctionSchema(input.schema);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);
    if (input.signal) {
      input.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You extract structured fields from short voice transcripts. Only include fields the speaker actually mentioned. Use null for fields you are unsure about.',
            },
            {
              role: 'user',
              content: input.transcript,
            },
          ],
          tools: [{ type: 'function', function: fnSchema }],
          tool_choice: { type: 'function', function: { name: fnSchema.name } },
          temperature: 0,
        }),
      });
    } catch (err) {
      clearTimeout(timeoutHandle);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ExtractionTimeoutError();
      }
      throw new ExtractionNetworkError('Failed to reach OpenAI', err);
    }
    clearTimeout(timeoutHandle);

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new ExtractionNetworkError(
        `OpenAI request failed (${response.status}): ${text.slice(0, 200)}`,
      );
    }

    let body: OpenAIChatResponse;
    try {
      body = (await response.json()) as OpenAIChatResponse;
    } catch (err) {
      throw new ExtractionMalformedError('OpenAI response was not valid JSON', err);
    }

    if (body.error?.message) {
      throw new ExtractionNetworkError(`OpenAI returned an error: ${body.error.message}`);
    }

    const toolCall = body.choices?.[0]?.message?.tool_calls?.[0]?.function;
    if (!toolCall || !toolCall.arguments) {
      throw new ExtractionMalformedError('OpenAI did not return a tool call', body);
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toolCall.arguments) as Record<string, unknown>;
    } catch (err) {
      throw new ExtractionMalformedError('Tool-call arguments were not valid JSON', err);
    }
    return {
      extracted: filterNullish(parsed),
      latencyMs: Date.now() - startedAt,
    };
  }
}
