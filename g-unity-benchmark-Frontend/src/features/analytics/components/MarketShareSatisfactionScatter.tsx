import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ScatterShapeProps, TooltipProps } from 'recharts';
import { useMemo } from 'react';
import { useMarketShareVsDevSatisfaction } from '../hooks/useAnalyticsData';
import {
  getAnalyticsErrorClassName,
  getAnalyticsErrorMessage,
} from '../utils/analyticsApiErrors';
import type { MarketShareSatisfactionItem } from '../types/analyticsTypes';
import { ANALYTICS_TOOLTIP_CURSOR_SCATTER } from '../utils/analyticsChartTooltip';

const segmentColors: Record<string, string> = {
  Unity: '#F97316',
  Unreal: '#00ADEF',
  Godot: '#10B981',
  Other: '#8B5CF6',
};

const ENGINE_ORDER = ['Unity', 'Unreal', 'Godot', 'Other'] as const;

type PlottedEngine = MarketShareSatisfactionItem & {
  satisfaction: number;
  sharePlot: number;
  satisfactionPlot: number;
  labelAbove: boolean;
};

/** Slight offset when multiple engines share the same (share, satisfaction) coordinates. */
function withOverlapJitter(
  items: (MarketShareSatisfactionItem & { satisfaction: number })[],
): PlottedEngine[] {
  const bucketKey = (d: MarketShareSatisfactionItem & { satisfaction: number }) =>
    `${d.share.toFixed(1)}|${d.satisfaction.toFixed(2)}`;

  const buckets = new Map<string, (MarketShareSatisfactionItem & { satisfaction: number })[]>();
  for (const item of items) {
    const key = bucketKey(item);
    const list = buckets.get(key) ?? [];
    list.push(item);
    buckets.set(key, list);
  }

  const out: PlottedEngine[] = [];
  for (const group of buckets.values()) {
    const sorted = [...group].sort((a, b) => {
      const ai = ENGINE_ORDER.indexOf(a.segment as (typeof ENGINE_ORDER)[number]);
      const bi = ENGINE_ORDER.indexOf(b.segment as (typeof ENGINE_ORDER)[number]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    const n = sorted.length;
    sorted.forEach((item, index) => {
      const offset = n > 1 ? index - (n - 1) / 2 : 0;
      const spread = offset * 5;
      out.push({
        ...item,
        sharePlot: Math.max(0, Math.min(100, item.share + spread)),
        satisfactionPlot:
          n > 1 ? item.satisfaction + offset * 0.25 : item.satisfaction,
        labelAbove: n > 1 ? index % 2 === 0 : false,
      });
    });
  }
  return out.sort((a, b) => {
    const ai = ENGINE_ORDER.indexOf(a.segment as (typeof ENGINE_ORDER)[number]);
    const bi = ENGINE_ORDER.indexOf(b.segment as (typeof ENGINE_ORDER)[number]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function renderEngineDot(props: ScatterShapeProps) {
  const { cx = 0, cy = 0, payload } = props;
  const p = payload as PlottedEngine | undefined;
  if (!p || p.satisfaction == null) return null;
  const isUnityBelowBenchmark =
    p.segment === 'Unity' && typeof p.benchmark === 'number' && p.satisfaction < p.benchmark;
  const fill = isUnityBelowBenchmark ? '#EF4444' : segmentColors[p.segment] ?? '#9CA3AF';
  const r = isUnityBelowBenchmark ? 7 : 6;
  const labelY = p.labelAbove ? cy - r - 6 : cy + r + 12;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#FFFFFF" strokeWidth={1.5} />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        fill="#E5E7EB"
        fontSize={11}
        fontWeight={600}
      >
        {p.segment}
      </text>
    </g>
  );
}

function ShareSatisfactionTooltipContent({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload as PlottedEngine | undefined;
  if (!p) return null;

  return (
    <div
      style={{
        backgroundColor: '#1F2937',
        border: '1px solid #4B5563',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ color: '#F9FAFB', fontWeight: 600, marginBottom: 4 }}>{p.label}</p>
      <p style={{ color: '#D1D5DB' }}>
        Share: <span style={{ color: '#fff' }}>{p.share}%</span>
      </p>
      <p style={{ color: '#D1D5DB' }}>
        Satisfaction: <span style={{ color: '#fff' }}>{p.satisfaction} / 10</span>
      </p>
      <p style={{ color: '#9CA3AF', marginTop: 4 }}>Benchmark: {p.benchmark} / 10</p>
    </div>
  );
}

export function MarketShareSatisfactionScatter() {
  const { data, isLoading, isError, error } = useMarketShareVsDevSatisfaction();

  const plotData = useMemo(() => {
    const scored = (data ?? []).filter(
      (d): d is MarketShareSatisfactionItem & { satisfaction: number } =>
        d.share > 0 && typeof d.satisfaction === 'number',
    );
    return withOverlapJitter(scored);
  }, [data]);

  const maxShare = useMemo(() => {
    if (!plotData.length) return 50;
    const peak = Math.max(...plotData.map((d) => d.sharePlot));
    return Math.min(100, Math.max(50, peak + 8));
  }, [plotData]);

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="text-gray-400 text-sm">Loading share vs satisfactionâ€¦</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className={getAnalyticsErrorClassName(error)}>
          {getAnalyticsErrorMessage(error, 'Could not load share vs satisfaction.')}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="text-gray-400 text-sm">No share vs satisfaction data for this dataset.</div>
      </div>
    );
  }

  if (plotData.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <h3 className="text-base font-semibold text-white mb-1">Share vs satisfaction</h3>
        <p className="text-xs text-gray-400 mb-3">
          Share of conversation per engine against its average satisfaction score (0–10).
        </p>
        <div className="text-gray-400 text-sm">
          No engines have a computable satisfaction score for this dataset.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-base font-semibold text-white mb-1">Share vs satisfaction</h3>
      <p className="text-xs text-gray-400 mb-3">
        Share of conversation per engine against its average satisfaction score (0–10).
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            type="number"
            dataKey="sharePlot"
            name="Share"
            unit="%"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            domain={[0, maxShare]}
          />
          <YAxis
            type="number"
            dataKey="satisfactionPlot"
            name="Satisfaction"
            unit=" /10"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            domain={[0, 10]}
          />
          <Tooltip
            content={<ShareSatisfactionTooltipContent />}
            cursor={ANALYTICS_TOOLTIP_CURSOR_SCATTER}
          />
          <Legend
            wrapperStyle={{
              color: '#F9FAFB',
              fontSize: '12px',
              marginTop: '12px',
            }}
          />
          {plotData.map((row) => (
            <Scatter
              key={row.segment}
              name={row.segment}
              data={[row]}
              fill={segmentColors[row.segment] ?? '#9CA3AF'}
              shape={renderEngineDot}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

