import { z } from "zod";

export const RealTimeMonitorAlertItemSchema = z.object({
  id: z.number(),
  source: z.string(),
  time: z.string(),
  category: z.string(),
  sentiment: z.string(),
  title: z.string(),
  tags: z.array(z.string()),
  live: z.boolean().optional(),
});

export const RealTimeMonitorResponseSchema = z.object({
  feeds: z.number(),
  forums: z.number(),
  news: z.number(),
  reports: z.number(),
  social: z.number(),
  total_posts: z.number().optional(),
  alerts_total: z.number().optional(),
  active_filter: z.string().optional(),
  available_filters: z.array(z.string()).optional(),
  alerts: z.array(RealTimeMonitorAlertItemSchema),
});

export const ChurnPredictionSchema = z.object({
  risk: z.string(),
  probability: z.number(),
  avg_churn_pct: z.number().optional(),
  high_count: z.number().optional(),
  medium_count: z.number().optional(),
  low_count: z.number().optional(),
});

export const NpsChurnResponseSchema = z.object({
  nps: z.record(z.string(), z.number()),
  churn: ChurnPredictionSchema,
  meta: z.record(z.string(), z.any()).optional(),
});

