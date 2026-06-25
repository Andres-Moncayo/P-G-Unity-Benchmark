import { apiClient } from "../../../services/apiClient";
import { RealTimeMonitorResponseSchema } from "../../../services/schemas";

export interface RealtimeMonitorAlert {
  id: number;
  source: string;
  time: string;
  category: string;
  sentiment: "positive" | "negative";
  title: string;
  tags: string[];
  live?: boolean;
}

export interface RealtimeMonitorData {
  alerts: RealtimeMonitorAlert[];
  alerts_total: number;
  active_filter: string;
}

export interface FetchRealtimeMonitorParams {
  limit?: number;
  offset?: number;
  category?: string;
}

export async function fetchRealtimeMonitor(
  params?: FetchRealtimeMonitorParams,
): Promise<RealtimeMonitorData> {
  const search = new URLSearchParams();
  search.set("limit", String(params?.limit ?? 8));
  search.set("offset", String(params?.offset ?? 0));
  if (params?.category) search.set("category", params.category);

  const raw = await apiClient<unknown>(`/dashboard/realtime-monitor?${search}`);
  const parsed = RealTimeMonitorResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Invalid realtime monitor response");
  }

  return {
    alerts: parsed.data.alerts as RealtimeMonitorAlert[],
    alerts_total: parsed.data.alerts_total ?? parsed.data.alerts.length,
    active_filter: parsed.data.active_filter ?? "Todos",
  };
}
