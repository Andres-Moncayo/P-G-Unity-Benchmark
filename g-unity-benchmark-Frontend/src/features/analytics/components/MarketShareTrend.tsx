import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AnalyticsChartMessage } from './AnalyticsChartMessage';
import { useMarketShareTrend } from '../hooks/useAnalyticsData';
import { ANALYTICS_TOOLTIP_CURSOR_LINE } from '../utils/analyticsChartTooltip';

export function MarketShareTrend() {
  const { data, isLoading, isError, error } = useMarketShareTrend();

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <h3 className="text-base font-semibold text-white mb-1">Market share trend</h3>
      <p className="text-xs text-gray-400 mb-3">
        Share of voice per engine over time, in percent.
      </p>

      <AnalyticsChartMessage
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!data || data.length === 0}
        loadingLabel="Loading market share…"
        emptyLabel="No market share data for this period."
        loadErrorLabel="Could not load market share."
      >
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="period" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              domain={[0, 100]}
              unit="%"
            />
            <Tooltip
              cursor={ANALYTICS_TOOLTIP_CURSOR_LINE}
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
            <Line
              type="monotone"
              dataKey="unity"
              stroke="#F97316"
              strokeWidth={2}
              name="Unity"
              dot={{ fill: '#F97316', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="unreal"
              stroke="#00ADEF"
              strokeWidth={2}
              name="Unreal"
              dot={{ fill: '#00ADEF', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="godot"
              stroke="#10B981"
              strokeWidth={2}
              name="Godot"
              dot={{ fill: '#10B981', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="other"
              stroke="#8B5CF6"
              strokeWidth={2}
              name="Other"
              dot={{ fill: '#8B5CF6', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </AnalyticsChartMessage>
    </div>
  );
}
