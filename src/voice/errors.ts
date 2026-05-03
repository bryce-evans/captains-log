export class WhisperUnavailableError extends Error {
  constructor(message = 'whisper.rn native binding is not available in this environment') {
    super(message);
    this.name = 'WhisperUnavailableError';
  }
}

export class WhisperInferenceError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'WhisperInferenceError';
    this.cause = cause;
  }
}

export class MicPermissionDeniedError extends Error {
  constructor(message = 'Microphone permission was not granted') {
    super(message);
    this.name = 'MicPermissionDeniedError';
  }
}

export class MicSessionError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'MicSessionError';
    this.cause = cause;
  }
}

export class ExtractionNetworkError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ExtractionNetworkError';
    this.cause = cause;
  }
}

export class ExtractionTimeoutError extends Error {
  constructor(message = 'GPT-4o extraction request timed out') {
    super(message);
    this.name = 'ExtractionTimeoutError';
  }
}

export class ExtractionMalformedError extends Error {
  readonly raw?: unknown;

  constructor(message: string, raw?: unknown) {
    super(message);
    this.name = 'ExtractionMalformedError';
    this.raw = raw;
  }
}
