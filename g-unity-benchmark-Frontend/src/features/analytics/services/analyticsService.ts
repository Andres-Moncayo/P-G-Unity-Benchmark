import { z } from 'zod';
import { apiClient } from '../../../services/apiClient';
import {
  analyticsBusinessToApiParam,
  type AnalyticsBusinessFilter,
} from '../types/analyticsBusinessFilter';
import {
  analyticsSummarySchema,
  developerSatisfactionSchema,
  marketShareSatisfactionSchema,
  marketShareTrendSchema,
  satisfactionByDimensionSchema,
  performanceGapApiRowSchema,
  performanceGapSchema,
  globalSentimentNPSSchema,
} from '../types/analyticsTypes';

function parseOrThrow<T>(label: string, schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 8)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    // eslint-disable-next-line no-console
    console.error(`[analytics] ${label} schema mismatch`, result.error.flatten?.() ?? result.error);
    throw new Error(`[analytics] ${label}: ${detail}`);
  }
  return result.data;
}

function mapPerformanceGapApiToChart(
  rows: z.infer<typeof performanceGapApiRowSchema>[],
): z.infer<typeof performanceGapSchema> {
  const iteration = rows.find((r) => /iteration/i.test(r.metric));
  const build = rows.find((r) => /build/i.test(r.metric));
  if (!iteration || !build) return [];
  return parseOrThrow(
    'performance-gap (chart)',
    performanceGapSchema,
    [
      { engine: 'Unity', iteration_time: iteration.unity, build_size: build.unity },
      { engine: 'Unreal', iteration_time: iteration.unreal, build_size: build.unreal },
      { engine: 'Godot', iteration_time: iteration.godot, build_size: build.godot },
    ],
  );
}

function withBusinessQuery(path: string, business?: AnalyticsBusinessFilter): string {
  const param = business ? analyticsBusinessToApiParam(business) : undefined;
  if (!param) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}business=${encodeURIComponent(param)}`;
}

export async function getAnalyticsSummary(business?: AnalyticsBusinessFilter) {
  const response = await apiClient<unknown>(withBusinessQuery('/api/analytics/summary', business));
  return parseOrThrow('summary', analyticsSummarySchema, response);
}

export async function getMarketShareVsDevSatisfaction(business?: AnalyticsBusinessFilter) {
  const response = await apiClient<unknown>(
    withBusinessQuery('/api/analytics/market-share-vs-satisfaction', business),
  );
  return parseOrThrow('market-share-vs-satisfaction', marketShareSatisfactionSchema, response);
}

export async function getMarketShareTrend(business?: AnalyticsBusinessFilter) {
  const response = await apiClient<unknown>(
    withBusinessQuery('/api/analytics/market-share-trend', business),
  );
  return parseOrThrow('market-share-trend', marketShareTrendSchema, response);
}

export async function getDeveloperSatisfaction(business?: AnalyticsBusinessFilter) {
  const response = await apiClient<unknown>(
    withBusinessQuery('/api/analytics/developer-satisfaction', business),
  );
  return parseOrThrow('developer-satisfaction', developerSatisfactionSchema, response);
}

export async function getSatisfactionByDimension(business?: AnalyticsBusinessFilter) {
  const response = await apiClient<unknown>(
    withBusinessQuery('/api/analytics/satisfaction-by-dimension', business),
  );
  return parseOrThrow('satisfaction-by-dimension', satisfactionByDimensionSchema, response);
}

export async function getPerformanceGap(business?: AnalyticsBusinessFilter) {
  const response = await apiClient<unknown>(
    withBusinessQuery('/api/analytics/performance-gap', business),
  );
  const rows = parseOrThrow('performance-gap (raw)', z.array(performanceGapApiRowSchema), response);
  return mapPerformanceGapApiToChart(rows);
}

export async function getGlobalSentimentNPS(business?: AnalyticsBusinessFilter) {
  const response = await apiClient<unknown>(
    withBusinessQuery('/api/analytics/global-sentiment-nps', business),
  );
  return parseOrThrow('global-sentiment-nps', globalSentimentNPSSchema, response);
}
