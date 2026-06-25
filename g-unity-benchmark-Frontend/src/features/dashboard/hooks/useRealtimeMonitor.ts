import { useQuery } from "@tanstack/react-query";
import {
  fetchRealtimeMonitor,
  type FetchRealtimeMonitorParams,
} from "../services/realtimeMonitorService";

export function useRealtimeMonitor(params?: FetchRealtimeMonitorParams) {
  return useQuery({
    queryKey: ["realtime-monitor", params ?? {}],
    queryFn: () =>
      fetchRealtimeMonitor({
        limit: 8,
        offset: 0,
        ...params,
      }),
    enabled: params !== undefined,
    staleTime: 60_000,
    retry: 1,
    retryDelay: 2_000,
  });
}
