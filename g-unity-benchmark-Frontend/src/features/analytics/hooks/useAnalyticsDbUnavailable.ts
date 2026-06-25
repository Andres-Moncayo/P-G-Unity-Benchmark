import {
  getDatabaseUnavailableMessage,
  isDatabaseUnavailableError,
} from '../utils/analyticsApiErrors';
import {
  useAnalyticsSummary,
  useDeveloperSatisfaction,
  useGlobalSentimentNPS,
  useMarketShareTrend,
  useMarketShareVsDevSatisfaction,
  usePerformanceGap,
  useSatisfactionByDimension,
} from './useAnalyticsData';

/** True if any analytics query failed with 503 database_unavailable. */
export function useAnalyticsDbUnavailable() {
  const summary = useAnalyticsSummary();
  const marketShareTrend = useMarketShareTrend();
  const developerSatisfaction = useDeveloperSatisfaction();
  const marketShareVsSatisfaction = useMarketShareVsDevSatisfaction();
  const satisfactionByDimension = useSatisfactionByDimension();
  const performanceGap = usePerformanceGap();
  const globalSentimentNps = useGlobalSentimentNPS();

  const errors = [
    summary.error,
    marketShareTrend.error,
    developerSatisfaction.error,
    marketShareVsSatisfaction.error,
    satisfactionByDimension.error,
    performanceGap.error,
    globalSentimentNps.error,
  ];

  const dbError = errors.find((e) => isDatabaseUnavailableError(e));
  return {
    isDbUnavailable: Boolean(dbError),
    message: dbError ? getDatabaseUnavailableMessage(dbError) : null,
  };
}
