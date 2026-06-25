import { useQuery } from "@tanstack/react-query";
import {
  fetchAnalyticsInsights,
  type FetchAnalyticsInsightsParams,
} from "../services/analyticsInsights";

export function useAnalyticsInsights(params?: FetchAnalyticsInsightsParams) {
  return useQuery({
    queryKey: ["analytics-insights", params ?? {}],
    queryFn: () => fetchAnalyticsInsights({ limit: 30, ...params }),
    staleTime: 60_000,
    retry: 1,
    retryDelay: 2_000,
  });
}
