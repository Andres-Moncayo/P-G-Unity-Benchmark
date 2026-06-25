import { apiClient } from "../../../services/apiClient";

export interface DashboardHighlightDTO {
  id: number;
  title: string;
  content: string;
  game_engine: string;
  category: string;
}

export interface DashboardPostHighlightDTO {
  id: number;
  title: string;
  summary: string;
  url: string | null;
  date: string | null;
  game_engine: string;
  category: string;
}

export interface DashboardHighlightsResponse {
  active_filter: string;
  available_filters: string[];
  category_counts: Record<string, number>;
  highlights: DashboardHighlightDTO[];
  post_highlights: DashboardPostHighlightDTO[];
}

export type HighlightCategoryFilter =
  | "all"
  | "ai"
  | "robotic"
  | "digital_twins";

export interface FetchHighlightsParams {
  limit?: number;
  category?: HighlightCategoryFilter;
}

export async function fetchDashboardHighlights(
  params?: FetchHighlightsParams,
): Promise<DashboardHighlightsResponse> {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.category) search.set("category", params.category);

  const qs = search.toString();
  const path = `/dashboard/highlights${qs ? `?${qs}` : ""}`;

  return apiClient<DashboardHighlightsResponse>(path);
}
