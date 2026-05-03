import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateCreator } from 'zustand';

import { SchemaRepository } from '../db/SchemaRepository';
import type { Schema } from '../db/schema';

export const ACTIVE_SCHEMA_STORAGE_KEY = 'captainslog.activeSchemaId';

export interface ActiveSchemaSlice {
  activeSchema: Schema | null;
  hydrateActiveSchema: () => Promise<void>;
  setActiveSchema: (id: string) => Promise<void>;
}

export const createActiveSchemaSlice: StateCreator<ActiveSchemaSlice, [], [], ActiveSchemaSlice> = (
  set,
) => ({
  activeSchema: null,

  hydrateActiveSchema: async () => {
    const storedId = await AsyncStorage.getItem(ACTIVE_SCHEMA_STORAGE_KEY);
    const all = await SchemaRepository.findAll();
    if (all.length === 0) {
      set(() => ({ activeSchema: null }));
      return;
    }
    const matched = storedId ? all.find((s) => s.id === storedId) : undefined;
    const next = matched ?? all[0] ?? null;
    set(() => ({ activeSchema: next }));
  },

  setActiveSchema: async (id) => {
    const schema = await SchemaRepository.findById(id);
    if (!schema) {
      throw new Error(`Schema not found: ${id}`);
    }
    await AsyncStorage.setItem(ACTIVE_SCHEMA_STORAGE_KEY, id);
    set(() => ({ activeSchema: schema }));
  },
});

export const selectActiveSchema = (state: ActiveSchemaSlice): Schema | null => state.activeSchema;
