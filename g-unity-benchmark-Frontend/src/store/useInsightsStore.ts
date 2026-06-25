import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnalyticsInsightDTO } from "../features/dashboard/services/analyticsInsights";

export type AnalyzedInsightRecord = {
  insight: AnalyticsInsightDTO;
  analyzedAt: string;
};

interface InsightsState {
  analyzedHistory: AnalyzedInsightRecord[];
  pendingAnalysis: AnalyticsInsightDTO | null;
  beginAnalysis: (insight: AnalyticsInsightDTO) => void;
  commitAnalysis: (id: number) => void;
  restoreToPending: (id: number) => void;
  resetHistory: () => void;
}

export const useInsightsStore = create<InsightsState>()(
  persist(
    (set, get) => ({
      analyzedHistory: [],
      pendingAnalysis: null,

      beginAnalysis: (insight) => set({ pendingAnalysis: insight }),

      commitAnalysis: (id) => {
        const pending = get().pendingAnalysis;
        const snapshot =
          pending?.id === id
            ? pending
            : get().analyzedHistory.find((row) => row.insight.id === id)
                ?.insight;

        if (!snapshot || snapshot.id !== id) return;

        set((state) => {
          if (state.analyzedHistory.some((row) => row.insight.id === id)) {
            return { pendingAnalysis: null };
          }
          return {
            pendingAnalysis: null,
            analyzedHistory: [
              {
                insight: snapshot,
                analyzedAt: new Date().toISOString(),
              },
              ...state.analyzedHistory,
            ],
          };
        });
      },

      restoreToPending: (id) =>
        set((state) => ({
          analyzedHistory: state.analyzedHistory.filter(
            (row) => row.insight.id !== id,
          ),
        })),

      resetHistory: () => set({ analyzedHistory: [], pendingAnalysis: null }),
    }),
    {
      name: "analytics-insights-state",
      version: 3,
      migrate: (persisted) => {
        const state = persisted as {
          analyzedHistory?: AnalyzedInsightRecord[];
          resolvedIds?: number[];
          reviewedIds?: number[];
        };
        if (Array.isArray(state.analyzedHistory)) {
          return {
            analyzedHistory: state.analyzedHistory,
            pendingAnalysis: null,
          };
        }
        return { analyzedHistory: [], pendingAnalysis: null };
      },
      partialize: (state) => ({
        analyzedHistory: state.analyzedHistory,
      }),
    },
  ),
);
