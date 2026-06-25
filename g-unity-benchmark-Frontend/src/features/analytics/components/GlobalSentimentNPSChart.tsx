import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import { AnalyticsChartMessage } from './AnalyticsChartMessage';
import { useGlobalSentimentNPS } from '../hooks/useAnalyticsData';
import { ANALYTICS_TOOLTIP_CURSOR } from '../utils/analyticsChartTooltip';

function NpsByEngineTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const value = row?.value;
  const seriesName = String(row?.name ?? 'NPS');
  const display =
    value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : String(value);
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{
        backgroundColor: '#1F2937',
        borderColor: '#4B5563',
        borderWidth: 1,
        borderStyle: 'solid',
        color: '#F9FAFB',
      }}
    >
      <p className="mb-1 text-xs font-semibold text-gray-200">{label}</p>
      <p className="text-sm font-medium text-white tabular-nums">
        <span className="text-gray-300">{seriesName}: </span>
        {display}
      </p>
    </div>
  );
}

export function GlobalSentimentNPSChart() {
  const { data, isLoading, isError, error } = useGlobalSentimentNPS();

  const chartData =
    data && data.platforms.length > 0
      ? data.platforms.map((p) => {
          const name =
            p.platform.length > 0
              ? p.platform.charAt(0).toUpperCase() + p.platform.slice(1).toLowerCase()
              : p.platform;
          const bench = data.benchmark_nps;
          return {
            name,
            nps: p.nps,
            isBelow: typeof bench === 'number' && p.nps < bench,
          };
        })
      : [];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-base font-semibold text-white mb-1">Sentiment & NPS by engine</h3>
      <p className="text-xs text-gray-400 mb-3">
        Estimated NPS per engine. Bars in red are below the cross-engine benchmark.
      </p>

      <AnalyticsChartMessage
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={chartData.length === 0}
        loadingLabel="Loading NPS…"
        emptyLabel="No NPS data for this dataset."
        loadErrorLabel="Could not load NPS."
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip content={<NpsByEngineTooltip />} cursor={ANALYTICS_TOOLTIP_CURSOR} />
            <Legend
              wrapperStyle={{
                color: '#F9FAFB',
                fontSize: '12px',
                marginTop: '20px',
              }}
            />
            <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />
            <Bar dataKey="nps" name="NPS (approx.)" minPointSize={3}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.isBelow ? '#FF4C4C' : '#10B981'} />
              ))}
              <LabelList
                dataKey="nps"
                position="top"
                formatter={(value: number) =>
                  Number.isFinite(value) ? value.toFixed(1) : '—'
                }
                fill="#E5E7EB"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </AnalyticsChartMessage>
    </div>
  );
}
