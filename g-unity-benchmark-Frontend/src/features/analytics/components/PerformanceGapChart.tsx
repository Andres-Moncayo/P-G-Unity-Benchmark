import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AnalyticsChartMessage } from './AnalyticsChartMessage';
import { usePerformanceGap } from '../hooks/useAnalyticsData';
import { ANALYTICS_TOOLTIP_CURSOR } from '../utils/analyticsChartTooltip';

export function PerformanceGapChart() {
  const { data, isLoading, isError, error } = usePerformanceGap();

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-base font-semibold text-white mb-1">Engagement & churn by engine</h3>
      <p className="text-xs text-gray-400 mb-3">
        Engagement index and average churn pressure, per engine.
      </p>

      <AnalyticsChartMessage
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data || data.length === 0}
        loadingLabel="Loading engagement metrics…"
        emptyLabel="No engagement metrics for this dataset."
        loadErrorLabel="Could not load engagement metrics."
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="engine"
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip
              cursor={ANALYTICS_TOOLTIP_CURSOR}
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #4B5563',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
              itemStyle={{ padding: '4px 0' }}
            />
            <Legend
              wrapperStyle={{
                color: '#F9FAFB',
                fontSize: '12px',
                marginTop: '20px',
              }}
            />
            <Bar dataKey="iteration_time" fill="#F97316" name="Engagement index" />
            <Bar dataKey="build_size" fill="#00ADEF" name="Churn pressure (avg. %)" />
          </BarChart>
        </ResponsiveContainer>
      </AnalyticsChartMessage>
    </div>
  );
}
