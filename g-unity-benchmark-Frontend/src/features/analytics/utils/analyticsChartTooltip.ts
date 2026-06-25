/**
 * Analytics chart hover — visible band on dark backgrounds, not harsh white.
 * Used via Tooltip `cursor` prop + `.analytics-charts` CSS fallback in global.css.
 */
export const ANALYTICS_TOOLTIP_CURSOR = {
  fill: 'rgba(255, 255, 255, 0.10)',
  stroke: 'rgba(148, 163, 184, 0.22)',
  strokeWidth: 1,
  radius: 4,
} as const;

/** Line charts — vertical slice at the hovered period (e.g. 2019). */
export const ANALYTICS_TOOLTIP_CURSOR_LINE = {
  fill: 'rgba(255, 255, 255, 0.10)',
  stroke: 'rgba(148, 163, 184, 0.22)',
  strokeWidth: 1,
} as const;

/** Scatter — crosshair at the hovered point. */
export const ANALYTICS_TOOLTIP_CURSOR_SCATTER = {
  stroke: 'rgba(148, 163, 184, 0.55)',
  strokeDasharray: '4 4',
  strokeWidth: 1,
} as const;
