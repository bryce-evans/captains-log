import { bootstrapDatabase } from '../db/database';
import { SchemaRepository } from '../db/SchemaRepository';

import { formatAnswer } from './formatAnswer';
import { createOpenAIClient, type OpenAIClient } from './OpenAIClient';
import { buildSqlPrompt } from './promptTemplates';
import { validateSql } from './sqlGuard';
import {
  AIQueryMalformedError,
  UnsafeQueryError,
  type AIQueryEngine,
  type QueryRequest,
  type QueryResult,
} from './types';

const SYSTEM_INSTRUCTION =
  'You translate natural-language questions into safe SQLite SELECT queries. ' +
  'Reply with a single JSON object of shape {"sql": "..."} and nothing else.';

export interface OpenAIQueryEngineOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly endpoint?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly client?: OpenAIClient;
}

interface SqlPayload {
  readonly sql?: unknown;
}

function extractSql(rawContent: string): string {
  const trimmed = rawContent.trim();
  // Tolerate optional markdown fences even though the prompt asks the model
  // not to use them.
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  let parsed: SqlPayload;
  try {
    parsed = JSON.parse(stripped) as SqlPayload;
  } catch {
    throw new AIQueryMalformedError('Model output was not valid JSON');
  }
  if (typeof parsed.sql !== 'string' || parsed.sql.trim().length === 0) {
    throw new AIQueryMalformedError('Model output did not include a sql string');
  }
  return parsed.sql;
}

export function createOpenAIQueryEngine(options: OpenAIQueryEngineOptions): AIQueryEngine {
  const client: OpenAIClient =
    options.client ??
    createOpenAIClient({
      apiKey: options.apiKey,
      endpoint: options.endpoint,
      timeoutMs: options.timeoutMs,
      fetchImpl: options.fetchImpl,
    });

  async function answer(req: QueryRequest): Promise<QueryResult> {
    const start = Date.now();
    const recentSchemas = await SchemaRepository.findAll();
    const prompt = buildSqlPrompt(req.activeSchema, recentSchemas);

    const rawContent = await client.chat({
      model: options.model,
      messages: [
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'system', content: prompt },
        { role: 'user', content: req.question },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0,
    });

    const candidateSql = extractSql(rawContent);
    const guard = validateSql(candidateSql);
    if (!guard.ok) {
      throw new UnsafeQueryError(guard.reason);
    }

    const db = await bootstrapDatabase();
    const rawRows = await db.getAllAsync<Record<string, unknown>>(guard.sql);
    const rows = rawRows.map((row) => Object.freeze({ ...row }));

    const text = formatAnswer(req.question, rows, req.activeSchema);
    const latencyMs = Date.now() - start;
    return Object.freeze({
      question: req.question,
      sql: guard.sql,
      rows,
      text,
      latencyMs,
    });
  }

  return { answer };
}
