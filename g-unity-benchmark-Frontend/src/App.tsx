import { useState, useEffect } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { Dashboard } from './features/dashboard';
import { MonitorizationContainer } from './features/monitorization';
import { CompetitorsContainer } from './features/competitors/competitors-container';
import { AnalyticsContainer } from './features/analytics/analytics-container';
import { AnalyticsBusinessFilterProvider } from './features/analytics/context/AnalyticsBusinessFilterContext';
import { ChatIAContainer } from './features/chat-ia';
import { SettingsContainer } from './features/settings';
import { useNavigationStore } from './store/useNavigationStore';
import { useSettingsStore } from './store/useSettingsStore';
import { LoginScreen } from './features/auth/components/LoginScreen';
import { Profile } from './features/profile/components/Profile';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { initializeApp } from './lib/initializeApp';
import { isOfflineMode, subscribeOfflineMode } from './config/offlineMode';

export function App() {
  const { currentPage } = useNavigationStore();
  
  const theme = useSettingsStore((state) => state.theme); 
  const isAuthenticated = useSettingsStore((state) => state.isAuthenticated);
  const hasHydrated = useSettingsStore((state) => state._hasHydrated);
  const dashboardFetching = useIsFetching({ queryKey: ['dashboard'] });

  const [appReady, setAppReady] = useState(false);
  const [offlineMode, setOfflineMode] = useState(isOfflineMode());
  const [isLoading, setIsLoading] = useState(false);
  const [mountDashboard, setMountDashboard] = useState(false);
  const [animationsReady, setAnimationsReady] = useState(false);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [shouldShowInitialLoader, setShouldShowInitialLoader] = useState(false);

  useEffect(() => subscribeOfflineMode(() => setOfflineMode(isOfflineMode())), []);

  useEffect(() => {
    if (!hasHydrated) return;
    let cancelled = false;
    initializeApp()
      .catch((err) => console.warn('[init] Error al inicializar la app:', err))
      .finally(() => {
        if (!cancelled) {
          setOfflineMode(isOfflineMode());
          setAppReady(true);
        }
      });
    return () => { cancelled = true; };
  }, [hasHydrated]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    setIsLoginPending(false);

    if (isAuthenticated) {
      setMountDashboard(true);
      setAnimationsReady(false);
      setIsLoading(true);
      setShouldShowInitialLoader(true);
      return;
    }

    setMountDashboard(false);
    setAnimationsReady(false);
    setIsLoading(false);
    setShouldShowInitialLoader(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !shouldShowInitialLoader) return;

    const finishLoading = () => {
      setIsLoading(false);
      setAnimationsReady(true);
      setShouldShowInitialLoader(false);
    };

    // Nunca bloquear más de 5s en la pantalla de carga inicial
    const safetyTimer = window.setTimeout(finishLoading, 5000);

    // En modo demo los datos son locales: no esperar al backend
    if (offlineMode) {
      const timer = window.setTimeout(finishLoading, 200);
      return () => {
        window.clearTimeout(timer);
        window.clearTimeout(safetyTimer);
      };
    }

    if (dashboardFetching > 0) {
      setIsLoading(true);
      return () => window.clearTimeout(safetyTimer);
    }

    const timer = window.setTimeout(finishLoading, 400);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(safetyTimer);
    };
  }, [isAuthenticated, dashboardFetching, shouldShowInitialLoader, offlineMode]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'monitorization': return <MonitorizationContainer />;
      case 'competitors': return <CompetitorsContainer />;
      case 'analytics': return <AnalyticsContainer />;
      case 'chat-ia': return <ChatIAContainer />;
      case 'settings': return <SettingsContainer />;
      case 'profile': return <Profile />; 
      default: return <Dashboard />;
    }
  };

  const hideTopAmbientGlow = currentPage === 'chat-ia';
  const BackgroundEffects = (
    <>
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(125, 211, 252, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(125, 211, 252, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {!hideTopAmbientGlow && (
        <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-gray-900/80 via-transparent to-transparent" />
      )}
      {!hideTopAmbientGlow && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[100%] h-[400px] rounded-full blur-[120px] pointer-events-none z-0 bg-gray-500/20" />
      )}
    </>
  );

  if (!appReady || !hasHydrated) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        <LoadingScreen isVisible />
      </div>
    );
  }

  if (!isAuthenticated && !offlineMode) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center p-4 transition-colors duration-500">
        {BackgroundEffects}
        <LoginScreen onLoadingChange={setIsLoginPending} />
        <LoadingScreen isVisible={isLoginPending} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black w-full relative overflow-hidden">
      <LoadingScreen isVisible={isLoading} />
      
      {mountDashboard && (
        <div className={`absolute inset-0 bg-black text-white transition-opacity duration-700 ${animationsReady ? 'opacity-100' : 'opacity-0'}`}>
          {BackgroundEffects}
          
          <AnalyticsBusinessFilterProvider>
            <Sidebar />
            {/* AQUÍ ESTÁ LA CORRECCIÓN: h-screen en lugar de min-h-screen */}
            <div className="ml-0 md:ml-[88px] flex h-screen flex-col relative z-10">
              <Header />
              {/* AQUÍ ESTÁ LA CORRECCIÓN: overflow-y-auto explícito en el main */}
              <main
                className={`flex-1 min-h-0 overflow-x-hidden ${
                  currentPage === 'chat-ia' ? 'overflow-hidden' : 'overflow-y-auto'
                }`}
              >
                {renderCurrentPage()}
              </main>
            </div>
          </AnalyticsBusinessFilterProvider>
        </div>
      )}
    </div>
  );
}

export default App;