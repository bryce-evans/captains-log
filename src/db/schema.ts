export type FieldType = 'string' | 'number' | 'enum';

export type FieldValue = string | number;

export type FieldMap = Readonly<Record<string, FieldValue>>;

export interface SchemaField {
  readonly key: string;
  readonly label: string;
  readonly type: FieldType;
  readonly important: boolean;
  readonly enumValues?: readonly string[];
}

export interface SchemaDefinition {
  readonly name: string;
  readonly fields: readonly SchemaField[];
}

export interface Schema extends SchemaDefinition {
  readonly id: string;
  readonly createdAt: number;
}

export interface RecordRow {
  readonly id: string;
  readonly schemaId: string;
  readonly createdAt: number;
  readonly fields: FieldMap;
  readonly photoPaths: readonly string[];
  readonly audioPath: string | null;
}

export interface SchemaPersistedRow {
  readonly id: string;
  readonly name: string;
  readonly definition_json: string;
  readonly created_at: number;
}

export interface RecordPersistedRow {
  readonly id: string;
  readonly schema_id: string;
  readonly created_at: number;
  readonly audio_path: string | null;
  readonly photo_paths_json: string | null;
  readonly fields_json: string;
}
