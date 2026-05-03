import type { StateCreator } from 'zustand';

export interface TranscriptSlice {
  partial: string;
  final: readonly string[];
  appendPartial: (s: string) => void;
  commitFinal: (s: string) => void;
  clear: () => void;
}

export const createTranscriptSlice: StateCreator<TranscriptSlice, [], [], TranscriptSlice> = (
  set,
) => ({
  partial: '',
  final: Object.freeze([]),

  appendPartial: (s) => {
    set(() => ({ partial: s }));
  },

  commitFinal: (s) => {
    set((state) => ({
      partial: '',
      final: Object.freeze([...state.final, s]),
    }));
  },

  clear: () => {
    set(() => ({ partial: '', final: Object.freeze([]) }));
  },
});

export const selectPartial = (state: TranscriptSlice): string => state.partial;
export const selectFinal = (state: TranscriptSlice): readonly string[] => state.final;
