import type { PlatformPulse } from '../hooks/useCompetitorsData';

interface Props {
  pulse: PlatformPulse[];
}

const ENGINE_COLORS: Record<string, { dot: string; text: string; bar: string; border: string }> = {
  unity:  { dot: 'bg-orange-400', text: 'text-orange-400', bar: 'bg-orange-400', border: 'border-orange-700' },
  unreal: { dot: 'bg-blue-400',   text: 'text-blue-400',   bar: 'bg-blue-500',   border: 'border-blue-700'   },
  godot:  { dot: 'bg-green-400',  text: 'text-green-400',  bar: 'bg-green-500',  border: 'border-green-700'  },
};

function npsColor(nps: number) {
  if (nps > 0)  return 'text-green-400';
  if (nps === 0) return 'text-yellow-400';
  return 'text-red-400';
}

function Bar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export function CompetitivePulse({ pulse }: Props) {
  if (!pulse || pulse.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Competitive Pulse</h3>
        <p className="text-gray-500 text-sm text-center py-6">Sin datos disponibles.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-1">Competitive Pulse</h3>
      <p className="text-sm text-gray-400 mb-5">Sentimiento y riesgo por plataforma</p>

      <div className="space-y-5">
        {pulse.map((item) => {
          const key    = (item.platform || '').toLowerCase();
          const colors = ENGINE_COLORS[key] ?? { dot: 'bg-gray-400', text: 'text-gray-400', bar: 'bg-gray-500', border: 'border-gray-700' };

          return (
            <div key={item.platform} className={`p-4 rounded-lg bg-gray-800/60 border ${colors.border}`}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-semibold capitalize ${colors.text}`}>{item.platform}</span>
                  <span className="text-xs text-gray-500">{item.post_count} posts</span>
                </div>
                <span className={`text-sm font-bold tabular-nums ${npsColor(item.nps)}`}>
                  NPS {item.nps > 0 ? '+' : ''}{item.nps}
                </span>
              </div>

              {/* NPS bar */}
              <div className="space-y-1">
                <Bar pct={Math.max(item.nps + 100, 0) / 2} colorClass={colors.bar} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
