import type { StateCreator } from 'zustand';

import { RecordRepository } from '../db/RecordRepository';
import type { FieldMap, FieldValue, RecordRow, SchemaField } from '../db/schema';

import type { ActiveSchemaSlice } from './activeSchemaSlice';

export type MarkDoneResult =
  | { readonly status: 'saved'; readonly record: RecordRow }
  | { readonly status: 'needs_review'; readonly emptyImportantFields: readonly SchemaField[] };

export interface MarkDoneOptions {
  readonly audioPath?: string | null;
  readonly photoPaths?: readonly string[];
}

export interface RecordDraftSlice {
  draft: FieldMap;
  setField: (key: string, value: FieldValue) => void;
  clearDraft: () => void;
  markDone: (opts?: MarkDoneOptions) => Promise<MarkDoneResult>;
  forceMarkDone: (opts?: MarkDoneOptions) => Promise<RecordRow>;
}

function isEmptyValue(value: FieldValue | undefined): boolean {
  if (value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return false;
}

function findEmptyImportantFields(
  fields: readonly SchemaField[],
  draft: FieldMap,
): readonly SchemaField[] {
  return fields.filter((f) => f.important && isEmptyValue(draft[f.key]));
}

export const createRecordDraftSlice: StateCreator<
  RecordDraftSlice & ActiveSchemaSlice,
  [],
  [],
  RecordDraftSlice
> = (set, get) => ({
  draft: Object.freeze({}),

  setField: (key, value) => {
    set((state) => ({
      draft: Object.freeze({ ...state.draft, [key]: value }),
    }));
  },

  clearDraft: () => {
    set(() => ({ draft: Object.freeze({}) }));
  },

  markDone: async (opts) => {
    const { activeSchema, draft } = get();
    if (!activeSchema) {
      throw new Error('No active schema selected');
    }
    const emptyImportant = findEmptyImportantFields(activeSchema.fields, draft);
    if (emptyImportant.length > 0) {
      return { status: 'needs_review', emptyImportantFields: emptyImportant };
    }
    const record = await RecordRepository.insert(
      activeSchema.id,
      draft,
      opts?.photoPaths ?? [],
      opts?.audioPath ?? null,
    );
    set(() => ({ draft: Object.freeze({}) }));
    return { status: 'saved', record };
  },

  forceMarkDone: async (opts) => {
    const { activeSchema, draft } = get();
    if (!activeSchema) {
      throw new Error('No active schema selected');
    }
    const record = await RecordRepository.insert(
      activeSchema.id,
      draft,
      opts?.photoPaths ?? [],
      opts?.audioPath ?? null,
    );
    set(() => ({ draft: Object.freeze({}) }));
    return record;
  },
});

export const selectDraft = (state: RecordDraftSlice): FieldMap => state.draft;
export const selectDraftFieldFactory =
  (key: string) =>
  (state: RecordDraftSlice): FieldValue | undefined =>
    state.draft[key];
