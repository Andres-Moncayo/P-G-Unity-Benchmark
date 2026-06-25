import { AnalyticsChartMessage } from './AnalyticsChartMessage';
import { useAnalyticsBusinessFilter } from '../context/AnalyticsBusinessFilterContext';
import { useAnalyticsSummary } from '../hooks/useAnalyticsData';

export function AnalyticsDashboard() {
  const { businessFilter } = useAnalyticsBusinessFilter();
  const { data, isLoading, isError, error } = useAnalyticsSummary();
  const metrics = data ?? [];

  const palette = {
    positive: {
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-700',
      textColor: 'text-green-400',
      trendLabel: 'Favorable trend',
    },
    negative: {
      bgColor: 'bg-red-900/20',
      borderColor: 'border-red-700',
      textColor: 'text-red-400',
      trendLabel: 'Unfavorable trend',
    },
    neutral: {
      bgColor: 'bg-slate-900/20',
      borderColor: 'border-slate-700',
      textColor: 'text-slate-300',
      trendLabel: 'Stable',
    },
  } as const;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-gray-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-white">Key performance indicators</h2>
          {businessFilter !== 'General' ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-600 bg-gray-800/80 text-gray-300 font-medium">
              {businessFilter}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400">
          <span>
            <span className="inline-block w-2 h-2 rounded-sm bg-green-500 mr-1.5 align-middle" />
            Favorable
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-sm bg-red-500 mr-1.5 align-middle" />
            Unfavorable
          </span>
          <span>
            <span className="inline-block w-2 h-2 rounded-sm bg-slate-400 mr-1.5 align-middle" />
            Stable
          </span>
        </div>
      </div>

      <AnalyticsChartMessage
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={metrics.length === 0}
        loadingLabel="Loading KPIs…"
        emptyLabel="No KPIs available for this dataset."
        loadErrorLabel="Could not load KPIs."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metrics.map((metric, index) => {
            const trend = metric.trend;
            const style = palette[trend];

            return (
              <article
                key={`${metric.label}-${index}`}
                className={`flex flex-col rounded-lg border p-3 ${style.bgColor} ${style.borderColor}`}
              >
                <div className="text-xl font-bold text-white tabular-nums leading-tight">{metric.value}</div>
                <h3 className="text-xs font-medium text-gray-200 mt-1.5 leading-snug">{metric.label}</h3>

                <p className={`text-[11px] mt-2 ${style.textColor}`}>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wide mb-0.5">
                    Period change
                  </span>
                  <span className="font-medium tabular-nums">
                    {metric.change.startsWith('+') ? '↑ ' : metric.change.startsWith('-') ? '↓ ' : ''}
                    {metric.change}
                  </span>
                  <span className="block text-[9px] text-gray-500 mt-0.5 normal-case font-normal">
                    {style.trendLabel}
                  </span>
                </p>
              </article>
            );
          })}
        </div>
      </AnalyticsChartMessage>
    </div>
  );
}
