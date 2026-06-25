/** Strategic pillars for Analytics — scoped to this feature only. */
export const ANALYTICS_BUSINESS_FILTERS = [
  'General',
  'Product',
  'Finance',
  'Ecosystem',
  'Positioning',
] as const;

export type AnalyticsBusinessFilter = (typeof ANALYTICS_BUSINESS_FILTERS)[number];

export const DEFAULT_ANALYTICS_BUSINESS_FILTER: AnalyticsBusinessFilter = 'General';

/** Widest label — used for stable button/pill widths. */
export const ANALYTICS_FILTER_LABEL_MAX = 'Positioning' as const;

const API_PARAM_BY_FILTER: Record<AnalyticsBusinessFilter, string | undefined> = {
  General: undefined,
  Product: 'producto',
  Finance: 'finanzas',
  Ecosystem: 'ecosistema',
  Positioning: 'posicionamiento',
};

/** Query param sent to `/api/analytics/*` when a pillar is selected (omit for General). */
export function analyticsBusinessToApiParam(filter: AnalyticsBusinessFilter): string | undefined {
  return API_PARAM_BY_FILTER[filter];
}
