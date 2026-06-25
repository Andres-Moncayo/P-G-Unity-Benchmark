import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- TIPOS ---
export type AppLanguage = 'en' | 'es';
export type ThemeOption = 'dark' | 'light' | 'high-contrast';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  full_name: string;
}

// --- CONTRATO DEL STORE ---
interface SettingsState {
  // 1. App Shell (Idioma y Tema)
  language: AppLanguage;
  toggleLanguage: () => void;
  setLanguage: (lang: AppLanguage) => void;
  
  theme: ThemeOption;
  setTheme: (theme: ThemeOption) => void;

  // 2. Auth State (Sesión)
  user: UserSession | null;
  token: string | null;
  isAuthenticated: boolean;
  /** true cuando Zustand terminó de rehidratar desde localStorage */
  _hasHydrated: boolean;
  login: (user: UserSession, token: string) => void;
  logout: () => void;
  
  // NUEVO: Función para actualizar el usuario en vivo
  updateUser: (updatedUser: Partial<UserSession>) => void;
}

// --- CREACIÓN DEL STORE CON PERSISTENCIA ---
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Estado Inicial App Shell
      language: 'es',
      theme: 'dark',
      
      // Acciones App Shell
      toggleLanguage: () => set((state) => ({ 
        language: state.language === 'en' ? 'es' : 'en' 
      })),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),

      // Estado Inicial Auth
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      
      // Acciones Auth
      login: (user, token) => set({ user, token, isAuthenticated: true, _hasHydrated: true }),
      logout: () => {
        const userId = get().user?.id;
        if (userId) {
          localStorage.removeItem(`unity_chat_conversation_id:${userId}`);
        }
        localStorage.removeItem('unity_chat_conversation_id');
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      // NUEVO: Implementación de la actualización en vivo
      updateUser: (updatedUser) => set((state) => ({
        // Mezclamos (spread operator) los datos viejos con los nuevos que lleguen
        user: state.user ? { ...state.user, ...updatedUser } : null
      })),
    }),
    {
      name: 'unity-nexus-session',
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[store] Error rehidratando sesión:', error);
        }
        useSettingsStore.setState({ _hasHydrated: true });
      },
    }
  )
);

if (typeof window !== 'undefined') {
  if (useSettingsStore.persist.hasHydrated()) {
    useSettingsStore.setState({ _hasHydrated: true });
  } else {
    useSettingsStore.persist.onFinishHydration(() => {
      useSettingsStore.setState({ _hasHydrated: true });
    });
  }

  // Fallback: nunca bloquear la app si la rehidratación tarda o falla
  window.setTimeout(() => {
    if (!useSettingsStore.getState()._hasHydrated) {
      useSettingsStore.setState({ _hasHydrated: true });
    }
  }, 2000);
}