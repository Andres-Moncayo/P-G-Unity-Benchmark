import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useRevenueComparison } from '../hooks/useCompetitorsData';

const FALLBACK_DATA = [
  { quarter: 'Q1 2023', Unity: 609,  'Unreal Engine': 1590, Godot: 8  },
  { quarter: 'Q2 2023', Unity: 532,  'Unreal Engine': 1620, Godot: 10 },
  { quarter: 'Q3 2023', Unity: 576,  'Unreal Engine': 1680, Godot: 12 },
  { quarter: 'Q4 2023', Unity: 608,  'Unreal Engine': 1590, Godot: 14 },
  { quarter: 'Q1 2024', Unity: 459,  'Unreal Engine': 1720, Godot: 17 },
  { quarter: 'Q2 2024', Unity: 424,  'Unreal Engine': 1780, Godot: 20 },
  { quarter: 'Q3 2024', Unity: 437,  'Unreal Engine': 1850, Godot: 23 },
  { quarter: 'Q4 2024', Unity: 449,  'Unreal Engine': 1958, Godot: 27 },
];

const PLATFORM_COLORS: Record<string, string> = {
  unity:           '#F97316',
  'Unity':         '#F97316',
  unreal:          '#00ADEF',
  'Unreal Engine': '#00ADEF',
  'unreal engine': '#00ADEF',
  godot:           '#10B981',
  'Godot':         '#10B981',
};

function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] ?? PLATFORM_COLORS[platform.toLowerCase()] ?? '#6B7280';
}

export function RevenueComparison() {
  const { data, isLoading } = useRevenueComparison();

  const isRealData = !isLoading && data && data.data_points.length > 0;

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Comparativa de Ingresos</h3>
        <div className="animate-pulse h-48 bg-gray-800 rounded" />
      </div>
    );
  }

  const chartData = isRealData
    ? data.quarters.map(quarter => {
        const entry: Record<string, string | number> = { quarter };
        data.data_points
          .filter(dp => dp.quarter === quarter)
          .forEach(dp => { entry[dp.platform] = dp.revenue_usd_millions; });
        return entry;
      })
    : FALLBACK_DATA;

  const platforms = isRealData
    ? [...new Set(data.data_points.map(dp => dp.platform))]
    : ['Unity', 'Unreal Engine', 'Godot'];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-2">Comparativa de Ingresos</h3>
      <p className="text-sm text-gray-400 mb-4">
        Millones USD por trimestre • {isRealData ? 'Datos reales' : 'Datos de referencia'}
      </p>


      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 40, left: 0, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="quarter"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="left"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10B981"
            tick={{ fill: '#10B981', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #4B5563' }}
            labelStyle={{ color: '#F9FAFB' }}
            formatter={(value) => [`$${value}M`, '']}
          />
          <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="Unity" fill="#F97316" name="Unity" radius={[2, 2, 0, 0]} />
          <Bar yAxisId="left" dataKey="Unreal Engine" fill="#00ADEF" name="Unreal Engine" radius={[2, 2, 0, 0]} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Godot"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 3 }}
            name="Godot"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}