import { createOpenAIQueryEngine } from './AIQueryEngine';
import { createStubAIQueryEngine } from './StubAIQueryEngine';
import type { AIQueryEngine } from './types';

export type { AIQueryEngine, QueryRequest, QueryResult } from './types';
export {
  AIQueryMalformedError,
  AIQueryNetworkError,
  AIQueryTimeoutError,
  UnsafeQueryError,
} from './types';
export { validateSql } from './sqlGuard';
export { formatAnswer } from './formatAnswer';
export { buildSqlPrompt } from './promptTemplates';
export { createOpenAIClient } from './OpenAIClient';
export { createOpenAIQueryEngine } from './AIQueryEngine';
export { createStubAIQueryEngine } from './StubAIQueryEngine';

let cachedEngine: AIQueryEngine | null = null;

function shouldUseStub(): boolean {
  if (process.env.EXPO_PUBLIC_USE_AI_STUB === 'true') {
    return true;
  }
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return true;
  }
  return false;
}

export function getAIQueryEngine(): AIQueryEngine {
  if (cachedEngine) {
    return cachedEngine;
  }
  if (shouldUseStub()) {
    cachedEngine = createStubAIQueryEngine();
    return cachedEngine;
  }
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? '';
  cachedEngine = createOpenAIQueryEngine({ apiKey });
  return cachedEngine;
}

export function resetAIQueryEngineForTests(): void {
  cachedEngine = null;
}
