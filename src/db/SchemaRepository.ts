import { v4 as uuidv4 } from 'uuid';

import { bootstrapDatabase } from './database';
import type { Schema, SchemaDefinition, SchemaPersistedRow } from './schema';
import { MVP_SEED_SCHEMAS } from './seedSchemas';

let seeded = false;

function rowToSchema(row: SchemaPersistedRow): Schema {
  const definition = JSON.parse(row.definition_json) as SchemaDefinition;
  return Object.freeze({
    id: row.id,
    name: row.name,
    fields: Object.freeze([...definition.fields]),
    createdAt: row.created_at,
  });
}

function freezeSchema(schema: Schema): Schema {
  return Object.freeze({
    ...schema,
    fields: Object.freeze([...schema.fields]),
  });
}

async function seedIfNeeded(): Promise<void> {
  if (seeded) {
    return;
  }
  const db = await bootstrapDatabase();
  for (const seed of MVP_SEED_SCHEMAS) {
    const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM schemas WHERE id = ?', [
      seed.id,
    ]);
    if (existing) {
      continue;
    }
    const definitionJson = JSON.stringify({
      name: seed.name,
      fields: seed.fields,
    } satisfies SchemaDefinition);
    await db.runAsync(
      'INSERT INTO schemas (id, name, definition_json, created_at) VALUES (?, ?, ?, ?)',
      [seed.id, seed.name, definitionJson, Date.now()],
    );
  }
  seeded = true;
}

export const SchemaRepository = {
  async findAll(): Promise<Schema[]> {
    await seedIfNeeded();
    const db = await bootstrapDatabase();
    const rows = await db.getAllAsync<SchemaPersistedRow>(
      'SELECT id, name, definition_json, created_at FROM schemas ORDER BY created_at ASC, name ASC',
    );
    return rows.map(rowToSchema);
  },

  async findById(id: string): Promise<Schema | null> {
    await seedIfNeeded();
    const db = await bootstrapDatabase();
    const row = await db.getFirstAsync<SchemaPersistedRow>(
      'SELECT id, name, definition_json, created_at FROM schemas WHERE id = ?',
      [id],
    );
    return row ? rowToSchema(row) : null;
  },

  async create(definition: SchemaDefinition): Promise<Schema> {
    await seedIfNeeded();
    const db = await bootstrapDatabase();
    const id = uuidv4();
    const createdAt = Date.now();
    const definitionJson = JSON.stringify(definition);
    await db.runAsync(
      'INSERT INTO schemas (id, name, definition_json, created_at) VALUES (?, ?, ?, ?)',
      [id, definition.name, definitionJson, createdAt],
    );
    return freezeSchema({
      id,
      name: definition.name,
      fields: definition.fields,
      createdAt,
    });
  },

  async delete(id: string): Promise<void> {
    await seedIfNeeded();
    const db = await bootstrapDatabase();
    await db.runAsync('DELETE FROM schemas WHERE id = ?', [id]);
  },
};

export function resetSchemaRepositoryForTests(): void {
  seeded = false;
}
