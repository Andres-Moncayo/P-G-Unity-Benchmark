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
} from 'recharts';
import type { LegendProps, TooltipProps } from 'recharts';
import { useSatisfactionByDimension } from '../hooks/useAnalyticsData';
import {
  getAnalyticsErrorClassName,
  getAnalyticsErrorMessage,
} from '../utils/analyticsApiErrors';
import type { SatisfactionByDimensionItem } from '../types/analyticsTypes';
import { ANALYTICS_TOOLTIP_CURSOR } from '../utils/analyticsChartTooltip';

const unityColor = '#F97316';
const unrealColor = '#00ADEF';
const godotColor = '#10B981';

const SERIES_COLOR_BY_NAME: Record<string, string> = {
  Unity: unityColor,
  Unreal: unrealColor,
  Godot: godotColor,
};

function SatisfactionByThemeLegend({ payload }: LegendProps) {
  if (!payload?.length) return null;
  return (
    <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3 list-none p-0 m-0">
      {payload.map((entry) => {
        const label = String(entry.value ?? '');
        const color = SERIES_COLOR_BY_NAME[label] ?? '#E5E7EB';
        return (
          <li key={label} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block w-2.5 h-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span style={{ color }}>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SatisfactionByThemeTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{
        backgroundColor: '#1F2937',
        borderColor: '#4B5563',
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      <p className="mb-1.5 text-xs font-semibold text-gray-200">{label}</p>
      <ul className="space-y-1 text-sm">
        {payload.map((entry, index) => {
          const name = String(entry.name ?? '');
          const color = SERIES_COLOR_BY_NAME[name] ?? '#E5E7EB';
          const raw = entry.value;
          const display =
            raw === null || raw === undefined || Number.isNaN(Number(raw)) ? '—' : String(raw);
          return (
            <li key={`${name}-${index}`} className="tabular-nums" style={{ color }}>
              <span className="font-medium">{name}</span>
              <span className="opacity-90">: {display}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SatisfactionByDimensionChart() {
  const { data, isLoading, isError, error } = useSatisfactionByDimension();

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="text-gray-400 text-sm">Loading satisfaction by theme…</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className={getAnalyticsErrorClassName(error)}>
          {getAnalyticsErrorMessage(error, 'Could not load satisfaction by theme.')}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
        <div className="text-gray-400 text-sm">No theme-level satisfaction data for this dataset.</div>
      </div>
    );
  }

  const belowBenchmarkCount = data.filter(
    (item) => item.unity != null && item.unity < item.benchmark,
  ).length;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-semibold text-white">Satisfaction by theme</h3>
          <p className="text-xs text-gray-400">
            Average satisfaction (0–10) per engine across key themes.
          </p>
        </div>
        <div className="rounded-full border border-gray-700 bg-gray-950/80 px-2.5 py-0.5 text-[11px] text-gray-300 whitespace-nowrap">
          Unity below benchmark: {belowBenchmarkCount}/{data.length}
        </div>
      </div>

      <div className="mb-3 rounded-md bg-gray-950/80 border border-gray-800 px-3 py-2 text-[11px] text-gray-300">
        <span className="font-medium text-white">Benchmark</span> per theme is the average across engines.
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="dimension" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} domain={[0, 10]} />
          <Tooltip
            cursor={ANALYTICS_TOOLTIP_CURSOR}
            content={<SatisfactionByThemeTooltip />}
          />
          <Legend content={<SatisfactionByThemeLegend />} />
          <Bar dataKey="unity" name="Unity" fill={unityColor}>
            {data.map((entry: SatisfactionByDimensionItem, index: number) => (
              <Cell
                key={`unity-cell-${index}`}
                fill={entry.unity == null ? 'rgba(0,0,0,0)' : unityColor}
              />
            ))}
          </Bar>
          <Bar dataKey="unreal" fill={unrealColor} name="Unreal" />
          <Bar dataKey="godot" fill={godotColor} name="Godot" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
