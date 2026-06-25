import { useQuery } from '@tanstack/react-query';
import {
  getAnalyticsSummary,
  getDeveloperSatisfaction,
  getMarketShareTrend,
  getMarketShareVsDevSatisfaction,
  getSatisfactionByDimension,
  getPerformanceGap,
  getGlobalSentimentNPS,
} from '../services/analyticsService';
import { useAnalyticsBusinessFilter } from '../context/AnalyticsBusinessFilterContext';

/**
 * Every analytics endpoint accepts ?business=<pillar> and applies its own
 * per-pillar formula on the backend (Product → bug categories, Finance → churn,
 * Ecosystem → docs/integrations, Positioning → promoter/detractor signal,
 * General → no filter). We mirror that here by re-keying each query with the
 * active filter so React Query refetches when the user switches pillar.
 */
export function useAnalyticsSummary() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  return useQuery({
    queryKey: ['analytics', 'summary', businessFilter],
    queryFn: () => getAnalyticsSummary(businessFilter),
  });
}

export function useMarketShareVsDevSatisfaction() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  return useQuery({
    queryKey: ['analytics', 'marketShareVsDevSatisfaction', businessFilter],
    queryFn: () => getMarketShareVsDevSatisfaction(businessFilter),
  });
}

export function useMarketShareTrend() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  return useQuery({
    queryKey: ['analytics', 'marketShareTrend', businessFilter],
    queryFn: () => getMarketShareTrend(businessFilter),
  });
}

export function useDeveloperSatisfaction() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  return useQuery({
    queryKey: ['analytics', 'developerSatisfaction', businessFilter],
    queryFn: () => getDeveloperSatisfaction(businessFilter),
  });
}

export function useSatisfactionByDimension() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  return useQuery({
    queryKey: ['analytics', 'satisfactionByDimension', businessFilter],
    queryFn: () => getSatisfactionByDimension(businessFilter),
  });
}

export function usePerformanceGap() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  return useQuery({
    queryKey: ['analytics', 'performanceGap', businessFilter],
    queryFn: () => getPerformanceGap(businessFilter),
  });
}

export function useGlobalSentimentNPS() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  return useQuery({
    queryKey: ['analytics', 'globalSentimentNPS', businessFilter],
    queryFn: () => getGlobalSentimentNPS(businessFilter),
  });
}
