import { AIQueryMalformedError, AIQueryNetworkError, AIQueryTimeoutError } from './types';

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

export interface OpenAIChatMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface OpenAIChatRequest {
  readonly messages: ReadonlyArray<OpenAIChatMessage>;
  readonly model?: string;
  readonly temperature?: number;
  readonly responseFormat?: { readonly type: 'json_object' | 'text' };
}

export interface OpenAIClientOptions {
  readonly apiKey: string;
  readonly endpoint?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export interface OpenAIClient {
  chat(req: OpenAIChatRequest): Promise<string>;
}

interface ChatCompletionResponse {
  readonly choices?: ReadonlyArray<{
    readonly message?: { readonly content?: string };
  }>;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'));
}

export function createOpenAIClient(options: OpenAIClientOptions): OpenAIClient {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;

  async function chat(req: OpenAIChatRequest): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const body = JSON.stringify({
      model: req.model ?? DEFAULT_MODEL,
      messages: req.messages,
      temperature: req.temperature ?? 0,
      ...(req.responseFormat ? { response_format: req.responseFormat } : {}),
    });

    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.apiKey}`,
        },
        body,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (isAbortError(err)) {
        throw new AIQueryTimeoutError(`OpenAI request timed out after ${timeoutMs}ms`);
      }
      throw new AIQueryNetworkError('OpenAI request failed', { cause: err });
    }
    clearTimeout(timer);

    if (!response.ok) {
      throw new AIQueryNetworkError(`OpenAI request failed with status ${response.status}`);
    }

    let parsed: ChatCompletionResponse;
    try {
      parsed = (await response.json()) as ChatCompletionResponse;
    } catch {
      throw new AIQueryMalformedError('OpenAI response was not valid JSON');
    }

    const content = parsed.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new AIQueryMalformedError('OpenAI response had no content');
    }
    return content;
  }

  return { chat };
}
