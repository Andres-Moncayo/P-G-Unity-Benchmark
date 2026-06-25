import { z } from 'zod';

export const marketShareSatisfactionItemSchema = z.object({
  segment: z.union([z.literal('Unity'), z.literal('Unreal'), z.literal('Godot'), z.literal('Other')]),
  label: z.string(),
  share: z.number().nonnegative(),
  satisfaction: z.number().min(0).max(10).nullable(),
  benchmark: z.number().min(0).max(10),
});

export const marketShareSatisfactionSchema = z.array(marketShareSatisfactionItemSchema);
export type MarketShareSatisfactionItem = z.infer<typeof marketShareSatisfactionItemSchema>;

export const satisfactionByDimensionItemSchema = z.object({
  dimension: z.string(),
  unity: z.number().min(0).max(10).nullable(),
  unreal: z.number().min(0).max(10).nullable(),
  godot: z.number().min(0).max(10).nullable(),
  benchmark: z.number().min(0).max(10),
});
export const satisfactionByDimensionSchema = z.array(satisfactionByDimensionItemSchema);
export type SatisfactionByDimensionItem = z.infer<typeof satisfactionByDimensionItemSchema>;

export const marketShareTrendItemSchema = z.object({
  period: z.string(),
  unity: z.number().nonnegative(),
  unreal: z.number().nonnegative(),
  godot: z.number().nonnegative(),
  other: z.number().nonnegative(),
});
export const marketShareTrendSchema = z.array(marketShareTrendItemSchema);
export type MarketShareTrendItem = z.infer<typeof marketShareTrendItemSchema>;

export const developerSatisfactionItemSchema = z.object({
  year: z.string(),
  unity: z.number().min(0).max(10).nullable(),
  unreal: z.number().min(0).max(10).nullable(),
  godot: z.number().min(0).max(10).nullable(),
});
export const developerSatisfactionSchema = z.array(developerSatisfactionItemSchema);
export type DeveloperSatisfactionItem = z.infer<typeof developerSatisfactionItemSchema>;

export const analyticsSummaryMetricSchema = z.object({
  label: z.string(),
  value: z.string(),
  change: z.string(),
  trend: z.enum(['positive', 'negative', 'neutral']),
  /** Human-readable calculation / data source note from the backend. */
  formula: z.string().nullish(),
  /** Optional longer explanation from the backend (if provided). */
  description: z.string().nullish(),
});
export const analyticsSummarySchema = z.array(analyticsSummaryMetricSchema);
export type AnalyticsSummaryMetric = z.infer<typeof analyticsSummaryMetricSchema>;

/** Fila API `/api/analytics/performance-gap` (métrica × motores). */
export const performanceGapApiRowSchema = z.object({
  metric: z.string(),
  unity: z.number(),
  unreal: z.number(),
  godot: z.number(),
});

/** Formato pivotado para el gráfico (motor × métricas). */
export const performanceGapItemSchema = z.object({
  engine: z.union([z.literal('Unity'), z.literal('Unreal'), z.literal('Godot')]),
  iteration_time: z.number().nonnegative(),
  build_size: z.number().nonnegative(),
});
export const performanceGapSchema = z.array(performanceGapItemSchema);
export type PerformanceGapItem = z.infer<typeof performanceGapItemSchema>;

export const globalSentimentNpsPlatformSchema = z.object({
  platform: z.string(),
  nps: z.number(),
  sentiment_positive: z.number(),
  sentiment_neutral: z.number(),
  sentiment_negative: z.number(),
});

export const globalSentimentNPSSchema = z.object({
  benchmark_nps: z.number().nullable(),
  unity_below_benchmark: z.boolean(),
  platforms: z.array(globalSentimentNpsPlatformSchema),
});
export type GlobalSentimentNPS = z.infer<typeof globalSentimentNPSSchema>;
