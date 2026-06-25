import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_ANALYTICS_BUSINESS_FILTER,
  type AnalyticsBusinessFilter,
} from '../types/analyticsBusinessFilter';

type AnalyticsBusinessFilterContextValue = {
  businessFilter: AnalyticsBusinessFilter;
  setBusinessFilter: (filter: AnalyticsBusinessFilter) => void;
};

const AnalyticsBusinessFilterContext = createContext<AnalyticsBusinessFilterContextValue | null>(
  null,
);

export function AnalyticsBusinessFilterProvider({ children }: { children: ReactNode }) {
  const [businessFilter, setBusinessFilterState] = useState<AnalyticsBusinessFilter>(
    DEFAULT_ANALYTICS_BUSINESS_FILTER,
  );

  const setBusinessFilter = useCallback((filter: AnalyticsBusinessFilter) => {
    setBusinessFilterState(filter);
  }, []);

  const value = useMemo(
    () => ({ businessFilter, setBusinessFilter }),
    [businessFilter, setBusinessFilter],
  );

  return (
    <AnalyticsBusinessFilterContext.Provider value={value}>
      {children}
    </AnalyticsBusinessFilterContext.Provider>
  );
}

export function useAnalyticsBusinessFilter() {
  const ctx = useContext(AnalyticsBusinessFilterContext);
  if (!ctx) {
    throw new Error('useAnalyticsBusinessFilter must be used within AnalyticsBusinessFilterProvider');
  }
  return ctx;
}