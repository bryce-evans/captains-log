import { create } from 'zustand';
import { Platform } from 'react-native';
import { SchemaRepository } from '../db/SchemaRepository';
import { RecordRepository } from '../db/RecordRepository';
import { seedTestData } from '../db/seed';

export type FieldType = 'text' | 'number' | 'enum';

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  important: boolean;
  options?: string[];
  autoFill?: 'timestamp' | 'gps' | 'weather';
}

export interface Schema {
  id: string;
  name: string;
  emoji: string;
  logLabel: string;
  fields: SchemaField[];
}

export interface FieldState {
  value: string | null;
  resolved: boolean;
}

export interface Record {
  id: string;
  schemaId: string;
  schemaName: string;
  schemaEmoji: string;
  createdAt: string;
  fields: { [key: string]: string };
  photoUri?: string;
}

// ── Seed data ────────────────────────────────────────────────────────────────

export const FISHING_SCHEMA: Schema = {
  id: 'fishing',
  name: 'Fishing Catch',
  emoji: '🎣',
  logLabel: 'Log Fish',
  fields: [
    { key: 'species',    label: 'Species',      type: 'text',   important: true },
    { key: 'weight_lbs', label: 'Weight (lbs)', type: 'number', important: true },
    { key: 'length_in',  label: 'Length (in)',  type: 'number', important: false },
    { key: 'lure',       label: 'Lure / Bait',  type: 'text',   important: false },
    { key: 'location',   label: 'Location',     type: 'text',   important: false },
    { key: 'time',       label: 'Time',         type: 'text',   important: false, autoFill: 'timestamp' },
    { key: 'weather',    label: 'Weather',      type: 'text',   important: false, autoFill: 'weather' },
    { key: 'notes',      label: 'Notes',        type: 'text',   important: false },
  ],
};

export const ART_SCHEMA: Schema = {
  id: 'art_sale',
  name: 'Art Show Sale',
  emoji: '🎨',
  logLabel: 'Log Sale',
  fields: [
    { key: 'item',       label: 'Item Sold',       type: 'text',   important: true },
    { key: 'price',      label: 'Price ($)',        type: 'number', important: true },
    { key: 'payment',    label: 'Payment Method',  type: 'enum',   important: false, options: ['Cash', 'Card', 'Venmo', 'Other'] },
    { key: 'buyer_name', label: 'Buyer Name',      type: 'text',   important: false },
    { key: 'time',       label: 'Time',            type: 'text',   important: false, autoFill: 'timestamp' },
    { key: 'notes',      label: 'Notes',           type: 'text',   important: false },
  ],
};

const DEFAULT_SCHEMAS = [FISHING_SCHEMA, ART_SCHEMA];


// ── Store ─────────────────────────────────────────────────────────────────────

interface AppState {
  dbReady: boolean;
  schemas: Schema[];
  activeSchema: Schema;
  setActiveSchema: (schema: Schema) => void;

  fieldState: { [key: string]: FieldState };
  setFieldValue: (key: string, value: string) => void;
  resetFieldState: () => void;

  records: Record[];
  loadRecords: () => Promise<void>;
  addRecord: (r: Record) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;

  queryAnswer: string | null;
  setQueryAnswer: (a: string | null) => void;

  initDb: () => Promise<void>;
}

function buildInitialFieldState(schema: Schema): { [key: string]: FieldState } {
  const state: { [key: string]: FieldState } = {};
  for (const field of schema.fields) {
    state[field.key] = { value: null, resolved: false };
  }
  return state;
}

function schemaMap(schemas: Schema[]): Map<string, { name: string; emoji: string }> {
  return new Map(schemas.map((s) => [s.id, { name: s.name, emoji: s.emoji }]));
}

export const useStore = create<AppState>((set, get) => ({
  dbReady: false,
  schemas: DEFAULT_SCHEMAS,
  activeSchema: FISHING_SCHEMA,
  setActiveSchema: (schema) =>
    set({ activeSchema: schema, fieldState: buildInitialFieldState(schema) }),

  fieldState: buildInitialFieldState(FISHING_SCHEMA),
  setFieldValue: (key, value) =>
    set((state) => ({
      fieldState: { ...state.fieldState, [key]: { value, resolved: true } },
    })),
  resetFieldState: () =>
    set((state) => ({ fieldState: buildInitialFieldState(state.activeSchema) })),

  records: [],
  loadRecords: async () => {
    if (Platform.OS === 'web') return;
    const { schemas } = get();
    const records = await RecordRepository.getAll(schemaMap(schemas));
    set({ records });
  },
  addRecord: async (r) => {
    if (Platform.OS !== 'web') await RecordRepository.insert(r);
    set((state) => ({ records: [r, ...state.records] }));
  },
  deleteRecord: async (id) => {
    if (Platform.OS !== 'web') await RecordRepository.delete(id);
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },

  queryAnswer: null,
  setQueryAnswer: (a) => set({ queryAnswer: a }),

  initDb: async () => {
    if (Platform.OS === 'web') {
      set({ dbReady: true }); // web uses in-memory seed data
      return;
    }
    await SchemaRepository.seed(DEFAULT_SCHEMAS);
    await seedTestData();
    const schemas = await SchemaRepository.getAll();
    const records = await RecordRepository.getAll(schemaMap(schemas));
    set({ schemas, records, dbReady: true });
  },
}));
