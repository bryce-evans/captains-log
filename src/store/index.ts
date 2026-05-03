import { create } from 'zustand';

import { createActiveSchemaSlice, type ActiveSchemaSlice } from './activeSchemaSlice';
import { createRecordDraftSlice, type RecordDraftSlice } from './recordDraftSlice';
import { createTranscriptSlice, type TranscriptSlice } from './transcriptSlice';

export type AppState = ActiveSchemaSlice & RecordDraftSlice & TranscriptSlice;

export const useStore = create<AppState>()((...args) => ({
  ...createActiveSchemaSlice(...args),
  ...createRecordDraftSlice(...args),
  ...createTranscriptSlice(...args),
}));

export type { ActiveSchemaSlice } from './activeSchemaSlice';
export { ACTIVE_SCHEMA_STORAGE_KEY, selectActiveSchema } from './activeSchemaSlice';
export type { MarkDoneOptions, MarkDoneResult, RecordDraftSlice } from './recordDraftSlice';
export { selectDraft, selectDraftFieldFactory } from './recordDraftSlice';
export type { TranscriptSlice } from './transcriptSlice';
export { selectFinal, selectPartial } from './transcriptSlice';
