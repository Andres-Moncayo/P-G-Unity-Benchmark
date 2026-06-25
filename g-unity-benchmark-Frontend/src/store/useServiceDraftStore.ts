import { create } from 'zustand';
import {
  generateServiceDraft,
  type ServiceDraftDTO,
  type ServiceDraftSource,
} from '../features/dashboard/services/serviceDraft';
import { useTechnicalFrictionStore } from './useTechnicalFrictionStore';

interface ServiceDraftState {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  draft: ServiceDraftDTO | null;
  editedText: string;
  openDraft: (analyzedPostId: number, source: ServiceDraftSource) => Promise<void>;
  closeDraft: () => void;
  setEditedText: (text: string) => void;
}

export const useServiceDraftStore = create<ServiceDraftState>((set) => ({
  isOpen: false,
  isLoading: false,
  error: null,
  draft: null,
  editedText: '',

  openDraft: async (analyzedPostId, source) => {
    set({
      isOpen: true,
      isLoading: true,
      error: null,
      draft: null,
      editedText: '',
    });
    try {
      const draft = await generateServiceDraft({ analyzedPostId, source });
      set({
        draft,
        editedText: draft.editable_draft,
        isLoading: false,
      });
      if (source === 'technical_friction') {
        useTechnicalFrictionStore.getState().recordDraft({
          analyzedPostId,
          title: draft.technical.title,
          category: draft.technical.bug_category ?? draft.technical.category,
          severity: draft.technical.severity,
          errorCode: draft.technical.issue_id,
          impactScore: draft.technical.impact,
          firstSeen: draft.technical.last_updated,
          description: draft.technical.recommendation,
        });
      }
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo generar el Service Draft.',
      });
    }
  },

  closeDraft: () =>
    set({
      isOpen: false,
      isLoading: false,
      error: null,
      draft: null,
      editedText: '',
    }),

  setEditedText: (text) => set({ editedText: text }),
}));
