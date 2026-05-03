import type { FieldMap, FieldValue, Schema, SchemaField } from './schema';

export class SchemaValidationError extends Error {
  readonly rejected: Readonly<Record<string, ValidationError>>;

  constructor(message: string, rejected: Readonly<Record<string, ValidationError>>) {
    super(message);
    this.name = 'SchemaValidationError';
    this.rejected = rejected;
  }
}

export class ValidationError extends Error {
  readonly fieldKey: string;
  readonly reason: ValidationReason;
  readonly rawValue: unknown;

  constructor(fieldKey: string, reason: ValidationReason, rawValue: unknown) {
    super(`Field "${fieldKey}" rejected: ${reason}`);
    this.name = 'ValidationError';
    this.fieldKey = fieldKey;
    this.reason = reason;
    this.rawValue = rawValue;
  }
}

export type ValidationReason =
  | 'not_a_number'
  | 'not_in_enum'
  | 'unsupported_type'
  | 'unknown_field';

export interface ValidationResult {
  readonly accepted: FieldMap;
  readonly rejected: Readonly<Record<string, ValidationError>>;
}

const NULLISH_STRINGS = new Set(['null', 'unknown', 'none', 'n/a', 'na']);

function isNullish(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === '') {
      return true;
    }
    if (NULLISH_STRINGS.has(trimmed)) {
      return true;
    }
  }
  return false;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function coerceEnum(value: unknown, enumValues: readonly string[]): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const lowered = value.trim().toLowerCase();
  if (lowered === '') {
    return null;
  }
  for (const candidate of enumValues) {
    if (candidate.toLowerCase() === lowered) {
      return candidate.toLowerCase();
    }
  }
  return null;
}

function coerceString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function coerceField(
  field: SchemaField,
  value: unknown,
): { accepted: FieldValue } | { rejected: ValidationError } | null {
  if (isNullish(value)) {
    return null;
  }

  switch (field.type) {
    case 'number': {
      const coerced = coerceNumber(value);
      if (coerced === null) {
        return { rejected: new ValidationError(field.key, 'not_a_number', value) };
      }
      return { accepted: coerced };
    }
    case 'enum': {
      const enumValues = field.enumValues ?? [];
      const coerced = coerceEnum(value, enumValues);
      if (coerced === null) {
        return { rejected: new ValidationError(field.key, 'not_in_enum', value) };
      }
      return { accepted: coerced };
    }
    case 'string': {
      const coerced = coerceString(value);
      if (coerced === null) {
        return null;
      }
      return { accepted: coerced };
    }
    default: {
      const exhaustive: never = field.type;
      return {
        rejected: new ValidationError(field.key, 'unsupported_type', exhaustive),
      };
    }
  }
}

export function validateAgainstSchema(
  extracted: Readonly<Record<string, unknown>>,
  schema: Schema,
): ValidationResult {
  const accepted: Record<string, FieldValue> = {};
  const rejected: Record<string, ValidationError> = {};

  const schemaFields = new Map(schema.fields.map((f) => [f.key, f] as const));

  for (const [key, value] of Object.entries(extracted)) {
    const field = schemaFields.get(key);
    if (!field) {
      continue;
    }
    const outcome = coerceField(field, value);
    if (outcome === null) {
      continue;
    }
    if ('accepted' in outcome) {
      accepted[key] = outcome.accepted;
    } else {
      rejected[key] = outcome.rejected;
    }
  }

  return {
    accepted: Object.freeze({ ...accepted }),
    rejected: Object.freeze({ ...rejected }),
  };
}
