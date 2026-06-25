import { create } from 'zustand';

export type AppPage = 'dashboard' | 'monitorization' | 'competitors' | 'analytics' | 'chat-ia' | 'settings' | 'profile';

interface NavigationState {
  currentPage: AppPage;
  isMobileMenuOpen: boolean;
  pendingPrompt: string | null;
  monitorizationRefreshToken: number;
  navigate: (page: AppPage) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  setPendingPrompt: (prompt: string | null) => void;
  triggerMonitorizationRefresh: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  isMobileMenuOpen: false,
  pendingPrompt: null,
  monitorizationRefreshToken: 0,
  navigate: (page) => {
    set({ currentPage: page, isMobileMenuOpen: false });
  },
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
  triggerMonitorizationRefresh: () =>
    set((state) => ({ monitorizationRefreshToken: state.monitorizationRefreshToken + 1 })),
}));