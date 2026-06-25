import { apiClient } from "../../../services/apiClient";

export interface AnalyticsInsightDTO {
  id: number;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  impact: number;
  trend: "up" | "down" | "stable";
  confidence: number;
  recommendation: string;
  lastUpdated: string;
}

interface AnalyticsInsightsApiResponse {
  meta: Record<string, unknown>;
  insights: AnalyticsInsightDTO[];
}

export interface FetchAnalyticsInsightsParams {
  limit?: number;
  severity?: string;
  category?: string;
}

export async function fetchAnalyticsInsights(
  params?: FetchAnalyticsInsightsParams,
): Promise<AnalyticsInsightDTO[]> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.severity) search.set("severity", params.severity);
  if (params?.category) search.set("category", params.category);

  const qs = search.toString();
  const path = `/dashboard/analytics-insights${qs ? `?${qs}` : ""}`;

  const data = await apiClient<AnalyticsInsightsApiResponse>(path);
  return data.insights ?? [];
}
