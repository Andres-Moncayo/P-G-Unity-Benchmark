import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardHighlights,
  type FetchHighlightsParams,
} from "../services/highlightsService";

export function useDashboardHighlights(params?: FetchHighlightsParams) {
  return useQuery({
    queryKey: ["dashboard-highlights", params ?? {}],
    queryFn: () => fetchDashboardHighlights({ limit: 50, ...params }),
    staleTime: 60_000,
    retry: 1,
    retryDelay: 2_000,
  });
}
