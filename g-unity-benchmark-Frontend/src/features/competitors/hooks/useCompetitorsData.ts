import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiClient } from '../../../services/apiClient';

// ── Zod schemas ────────────────────────────────────────────────────────────

const EngineMetricSchema = z.object({
  engine: z.string(),
  platform: z.string(),
  post_count: z.number(),
  positive_count: z.number(),
  negative_count: z.number(),
  neutral_count: z.number(),
  promotor_total: z.number(),
  detractor_total: z.number(),
  churn_risk_count: z.number(),
  high_alerts: z.number(),
  medium_alerts: z.number(),
  low_alerts: z.number(),
  nps_score: z.number(),
  sentiment_score: z.number(),
});

const CompetitorMetricsSummarySchema = z.object({
  unity_post_count: z.number(),
  unity_nps: z.number(),
  competitor_post_count: z.number(),
  critical_alerts: z.number(),
  high_alerts: z.number(),
  total_churn_risk: z.number(),
});

const PlatformPulseSchema = z.object({
  platform: z.string(),
  post_count: z.number(),
  positive_pct: z.number(),
  negative_pct: z.number(),
  churn_risk_pct: z.number(),
  nps: z.number(),
});

const AlertItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string().nullable(),
  platform: z.string(),
  alert_type: z.string(),
  sentimental: z.string(),
  churn_risk: z.string().nullable(),
  url: z.string().nullable(),
  date_post: z.string().nullable(),
});

const RecentPostItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  summary: z.string().nullable(),
  platform: z.string(),
  sentimental: z.string(),
  alert_type: z.string(),
  bug: z.string().nullable(),
  performance: z.string().nullable(),
  url: z.string().nullable(),
  date_post: z.string().nullable(),
});

const CompetitorsDashboardSchema = z.object({
  summary: CompetitorMetricsSummarySchema,
  engines: z.array(EngineMetricSchema),
  pulse: z.array(PlatformPulseSchema),
  critical_alerts: z.array(AlertItemSchema),
  recent_posts: z.array(RecentPostItemSchema),
});

// ── Exported types ─────────────────────────────────────────────────────────

export type EngineMetric = z.infer<typeof EngineMetricSchema>;
export type CompetitorMetricsSummary = z.infer<typeof CompetitorMetricsSummarySchema>;
export type PlatformPulse = z.infer<typeof PlatformPulseSchema>;
export type AlertItem = z.infer<typeof AlertItemSchema>;
export type RecentPostItem = z.infer<typeof RecentPostItemSchema>;
export type CompetitorsDashboard = z.infer<typeof CompetitorsDashboardSchema>;

const RevenueDataPointSchema = z.object({
  quarter: z.string(),
  company: z.string(),
  platform: z.string(),
  revenue_usd_millions: z.number(),
  source_type: z.string().nullable(),
});

const RevenueComparisonSchema = z.object({
  data_points: z.array(RevenueDataPointSchema),
  quarters: z.array(z.string()),
});

export type RevenueDataPoint = z.infer<typeof RevenueDataPointSchema>;
export type RevenueComparison = z.infer<typeof RevenueComparisonSchema>;

const MarketPositioningItemSchema = z.object({
  id: z.number(),
  engine: z.string(),
  platform: z.string(),
  user_segment: z.string(),
  strength: z.number(),
  trend: z.string(),
  recorded_at: z.union([z.string(), z.date()]).transform(v => String(v)),
});

export type MarketPositioningItem = z.infer<typeof MarketPositioningItemSchema>;

export function useMarketPositioning() {
  return useQuery({
    queryKey: ['competitors', 'market-positioning'],
    queryFn: async (): Promise<MarketPositioningItem[]> => {
      const raw = await apiClient<unknown>('/competitors/market-positioning');
      return z.array(MarketPositioningItemSchema).parse(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueComparison() {
  return useQuery({
    queryKey: ['competitors', 'revenue'],
    queryFn: async (): Promise<RevenueComparison> => {
      const raw = await apiClient<unknown>('/competitors/revenue');
      return RevenueComparisonSchema.parse(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────

const StrategicInitiativeSchema = z.object({
  id: z.number(),
  company: z.string(),
  platform: z.string(),
  initiative: z.string(),
  description: z.string().nullable(),
  impact: z.string(),
  timeline: z.string().nullable(),
  status: z.string().nullable().optional(),
  source_url: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type StrategicInitiativeItem = z.infer<typeof StrategicInitiativeSchema>;

export function useStrategicInitiatives() {
  return useQuery({
    queryKey: ['competitors', 'strategic-initiatives'],
    queryFn: async (): Promise<StrategicInitiativeItem[]> => {
      const raw = await apiClient<unknown>('/competitors/strategic-initiatives');
      return z.array(StrategicInitiativeSchema).parse(raw);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompetitorsData() {
  return useQuery({
    queryKey: ['competitors', 'dashboard'],
    queryFn: async (): Promise<CompetitorsDashboard> => {
      const raw = await apiClient<unknown>('/competitors/dashboard');
      return CompetitorsDashboardSchema.parse(raw);
    },
    staleTime: 2 * 60 * 1000,   // 2 min
    refetchInterval: 5 * 60 * 1000, // refresco cada 5 min
  });
}
