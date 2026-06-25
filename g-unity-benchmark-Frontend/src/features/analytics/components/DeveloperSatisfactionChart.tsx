import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { AnalyticsChartMessage } from './AnalyticsChartMessage';
import { useDeveloperSatisfaction } from '../hooks/useAnalyticsData';
import { ANALYTICS_TOOLTIP_CURSOR } from '../utils/analyticsChartTooltip';

function formatBarValue(value: unknown): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return String(value);
}

export function DeveloperSatisfactionChart() {
  const { data, isLoading, isError, error } = useDeveloperSatisfaction();

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-base font-semibold text-white mb-1">Engine satisfaction by year</h3>
      <p className="text-xs text-gray-400 mb-3">
        Average satisfaction score (0–10) per engine, by year.
      </p>

      <AnalyticsChartMessage
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data || data.length === 0}
        loadingLabel="Loading satisfaction…"
        emptyLabel="No satisfaction data for this dataset."
        loadErrorLabel="Could not load satisfaction."
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} domain={[0, 10]} />
            <Tooltip
              cursor={ANALYTICS_TOOLTIP_CURSOR}
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #4B5563',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
              formatter={(value, name) => [formatBarValue(value), String(name ?? '')]}
            />
            <Legend
              wrapperStyle={{
                color: '#F9FAFB',
                fontSize: '12px',
                marginTop: '20px',
              }}
            />
            <Bar dataKey="unity" fill="#F97316" name="Unity" />
            <Bar dataKey="unreal" fill="#00ADEF" name="Unreal" />
            <Bar dataKey="godot" fill="#10B981" name="Godot" />
          </BarChart>
        </ResponsiveContainer>
      </AnalyticsChartMessage>
    </div>
  );
}
