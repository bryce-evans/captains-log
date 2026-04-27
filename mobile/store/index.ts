import { create } from 'zustand';

export type FieldType = 'text' | 'number' | 'enum';

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  important: boolean;
  options?: string[]; // for enum
  autoFill?: 'timestamp' | 'gps' | 'weather';
}

export interface Schema {
  id: string;
  name: string;
  emoji: string;
  logLabel: string; // e.g. "Log Fish", "Log Sale"
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

interface AppState {
  schemas: Schema[];
  activeSchema: Schema;
  setActiveSchema: (schema: Schema) => void;

  fieldState: { [key: string]: FieldState };
  setFieldValue: (key: string, value: string) => void;
  resetFieldState: () => void;
  simulateVoiceFill: () => void;

  records: Record[];
  addRecord: (r: Record) => void;

  queryAnswer: string | null;
  setQueryAnswer: (a: string | null) => void;
}

const FISHING_SCHEMA: Schema = {
  id: 'fishing',
  name: 'Fishing Catch',
  emoji: '🎣',
  logLabel: 'Log Fish',
  fields: [
    { key: 'species', label: 'Species', type: 'text', important: true },
    { key: 'weight_lbs', label: 'Weight (lbs)', type: 'number', important: true },
    { key: 'length_in', label: 'Length (in)', type: 'number', important: false },
    { key: 'lure', label: 'Lure / Bait', type: 'text', important: false },
    { key: 'location', label: 'Location', type: 'text', important: false },
    { key: 'time', label: 'Time', type: 'text', important: false, autoFill: 'timestamp' },
    { key: 'weather', label: 'Weather', type: 'text', important: false, autoFill: 'weather' },
    { key: 'notes', label: 'Notes', type: 'text', important: false },
  ],
};

const ART_SCHEMA: Schema = {
  id: 'art_sale',
  name: 'Art Show Sale',
  emoji: '🎨',
  logLabel: 'Log Sale',
  fields: [
    { key: 'item', label: 'Item Sold', type: 'text', important: true },
    { key: 'price', label: 'Price ($)', type: 'number', important: true },
    { key: 'payment', label: 'Payment Method', type: 'enum', important: false, options: ['Cash', 'Card', 'Venmo', 'Other'] },
    { key: 'buyer_name', label: 'Buyer Name', type: 'text', important: false },
    { key: 'time', label: 'Time', type: 'text', important: false, autoFill: 'timestamp' },
    { key: 'notes', label: 'Notes', type: 'text', important: false },
  ],
};

const SEED_RECORDS: Record[] = [
  {
    id: '1',
    schemaId: 'fishing',
    schemaName: 'Fishing Catch',
    schemaEmoji: '🎣',
    createdAt: '2026-04-26T14:32:00Z',
    fields: { species: 'Largemouth Bass', weight_lbs: '4.2', length_in: '18', lure: 'Plastic Worm', location: 'Lake Cayuga', weather: 'Partly cloudy, 68°F' },
  },
  {
    id: '2',
    schemaId: 'fishing',
    schemaName: 'Fishing Catch',
    schemaEmoji: '🎣',
    createdAt: '2026-04-25T09:15:00Z',
    fields: { species: 'Yellow Perch', weight_lbs: '0.8', length_in: '10', lure: 'Minnow', location: 'Lake Cayuga', weather: 'Sunny, 61°F' },
  },
  {
    id: '3',
    schemaId: 'art_sale',
    schemaName: 'Art Show Sale',
    schemaEmoji: '🎨',
    createdAt: '2026-04-20T11:45:00Z',
    fields: { item: 'Watercolor landscape #7', price: '120', payment: 'Venmo', buyer_name: 'Sarah M.' },
  },
];

function buildInitialFieldState(schema: Schema): { [key: string]: FieldState } {
  const state: { [key: string]: FieldState } = {};
  for (const field of schema.fields) {
    state[field.key] = { value: null, resolved: false };
  }
  return state;
}

export const useStore = create<AppState>((set, get) => ({
  schemas: [FISHING_SCHEMA, ART_SCHEMA],
  activeSchema: FISHING_SCHEMA,
  setActiveSchema: (schema) =>
    set({ activeSchema: schema, fieldState: buildInitialFieldState(schema) }),

  fieldState: buildInitialFieldState(FISHING_SCHEMA),
  setFieldValue: (key, value) =>
    set((state) => ({
      fieldState: {
        ...state.fieldState,
        [key]: { value, resolved: true },
      },
    })),
  resetFieldState: () =>
    set((state) => ({ fieldState: buildInitialFieldState(state.activeSchema) })),

  simulateVoiceFill: () => {
    const { activeSchema, setFieldValue } = get();
    const fields = activeSchema.fields;
    const mockValues: { [key: string]: string } = {
      species: 'Smallmouth Bass',
      weight_lbs: '3.1',
      length_in: '16',
      lure: 'Jig',
      location: 'Seneca Lake',
      time: new Date().toLocaleTimeString(),
      weather: 'Sunny, 72°F',
      notes: 'Near the dock',
      item: 'Abstract acrylic #12',
      price: '85',
      payment: 'Card',
      buyer_name: 'Alex T.',
    };
    let delay = 0;
    for (const field of fields) {
      const val = mockValues[field.key] || 'N/A';
      setTimeout(() => setFieldValue(field.key, val), delay);
      delay += 700;
    }
  },

  records: SEED_RECORDS,
  addRecord: (r) => set((state) => ({ records: [r, ...state.records] })),

  queryAnswer: null,
  setQueryAnswer: (a) => set({ queryAnswer: a }),
}));
