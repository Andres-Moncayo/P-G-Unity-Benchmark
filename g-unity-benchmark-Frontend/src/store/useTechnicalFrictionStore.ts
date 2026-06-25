import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TechnicalFrictionDraftRecord = {
  analyzedPostId: number;
  title: string;
  category: string;
  severity: string;
  errorCode: string;
  impactScore?: number;
  firstSeen: string;
  description: string;
  generatedAt: string;
};

interface TechnicalFrictionState {
  draftHistory: TechnicalFrictionDraftRecord[];
  recordDraft: (record: Omit<TechnicalFrictionDraftRecord, "generatedAt">) => void;
  restoreToPending: (analyzedPostId: number) => void;
  resetDraftHistory: () => void;
}

export const useTechnicalFrictionStore = create<TechnicalFrictionState>()(
  persist(
    (set) => ({
      draftHistory: [],

      recordDraft: (record) =>
        set((state) => ({
          draftHistory: [
            {
              ...record,
              generatedAt: new Date().toISOString(),
            },
            ...state.draftHistory.filter(
              (row) => row.analyzedPostId !== record.analyzedPostId,
            ),
          ],
        })),

      restoreToPending: (analyzedPostId) =>
        set((state) => ({
          draftHistory: state.draftHistory.filter(
            (row) => row.analyzedPostId !== analyzedPostId,
          ),
        })),

      resetDraftHistory: () => set({ draftHistory: [] }),
    }),
    {
      name: "technical-friction-draft-history",
      version: 1,
      partialize: (state) => ({ draftHistory: state.draftHistory }),
    },
  ),
);
