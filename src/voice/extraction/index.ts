import { OpenAIFieldExtractor } from './OpenAIFieldExtractor';
import { StubFieldExtractor } from './StubFieldExtractor';
import type { FieldExtractor } from './types';

let memoized: FieldExtractor | null = null;

function shouldUseStub(): boolean {
  if (process.env.EXPO_PUBLIC_USE_EXTRACTION_STUB === 'true') {
    return true;
  }
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  return false;
}

export function getFieldExtractor(): FieldExtractor {
  if (memoized) {
    return memoized;
  }
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (shouldUseStub() || !apiKey) {
    memoized = new StubFieldExtractor();
    return memoized;
  }
  memoized = new OpenAIFieldExtractor({ apiKey });
  return memoized;
}

export function __resetFieldExtractor(): void {
  memoized = null;
}

export type { ExtractionInput, ExtractionResult, FieldExtractor } from './types';
export { OpenAIFieldExtractor, buildFunctionSchema } from './OpenAIFieldExtractor';
export { StubFieldExtractor } from './StubFieldExtractor';
