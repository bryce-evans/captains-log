import type { Schema, SchemaField } from './schema';

export const FISHING_SCHEMA_ID = 'mvp.fishing';
export const ART_SHOW_SCHEMA_ID = 'mvp.art_show';

const fishingFields: readonly SchemaField[] = [
  { key: 'species', label: 'Species', type: 'string', important: true },
  { key: 'length_in', label: 'Length (in)', type: 'number', important: true },
  { key: 'weight_lb', label: 'Weight (lb)', type: 'number', important: false },
  { key: 'location', label: 'Location', type: 'string', important: false },
  { key: 'notes', label: 'Notes', type: 'string', important: false },
];

const artShowFields: readonly SchemaField[] = [
  { key: 'item', label: 'Item', type: 'string', important: true },
  { key: 'price', label: 'Price', type: 'number', important: true },
  { key: 'buyer_name', label: 'Buyer', type: 'string', important: false },
  {
    key: 'payment_method',
    label: 'Payment',
    type: 'enum',
    important: false,
    enumValues: ['cash', 'card', 'venmo', 'zelle', 'check', 'other'],
  },
  { key: 'notes', label: 'Notes', type: 'string', important: false },
];

export const MVP_SEED_SCHEMAS: ReadonlyArray<Omit<Schema, 'createdAt'>> = [
  {
    id: FISHING_SCHEMA_ID,
    name: 'Fishing',
    fields: fishingFields,
  },
  {
    id: ART_SHOW_SCHEMA_ID,
    name: 'Art Show Sale',
    fields: artShowFields,
  },
];
