import { useState } from 'react';
import { useMarketPositioning } from '../hooks/useCompetitorsData';

const COMPETITORS = ['Unreal', 'Godot'] as const;
type Competitor = typeof COMPETITORS[number];

const ENGINE_DOT: Record<string, string> = {
  'Unity':  'bg-orange-400',
  'Unreal': 'bg-blue-400',
  'Godot':  'bg-green-400',
};
const ENGINE_BAR: Record<string, string> = {
  'Unity':  'bg-orange-400',
  'Unreal': 'bg-blue-500',
  'Godot':  'bg-green-500',
};
const ENGINE_TEXT: Record<string, string> = {
  'Unity':  'text-orange-400',
  'Unreal': 'text-blue-400',
  'Godot':  'text-green-400',
};
const ENGINE_BADGE: Record<string, string> = {
  'Unreal': 'text-blue-400 bg-blue-900/30 border-blue-700',
  'Godot':  'text-green-400 bg-green-900/30 border-green-700',
};

function TrendArrow({ unity, competitor }: { unity: number; competitor: number }) {
  const diff = unity - competitor;
  if (diff > 5)  return <span className="text-green-400 font-bold text-sm">↑</span>;
  if (diff < -5) return <span className="text-red-400 font-bold text-sm">↓</span>;
  return <span className="text-gray-400 font-bold text-sm">→</span>;
}

export function MarketPositioning() {
  const { data, isLoading, isError } = useMarketPositioning();
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Market Positioning</h3>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Market Positioning</h3>
        <p className="text-red-400 text-sm">Error cargando datos.</p>
      </div>
    );
  }

  // Build segment map — include all segments from Unity and selected competitor
  const segmentMap = new Map<string, { unity?: number; rival?: number }>();
  for (const item of data) {
    if (item.engine === 'Unity') {
      const entry = segmentMap.get(item.user_segment) ?? {};
      segmentMap.set(item.user_segment, { ...entry, unity: item.strength });
    }
    if (competitor && item.engine === competitor) {
      const entry = segmentMap.get(item.user_segment) ?? {};
      segmentMap.set(item.user_segment, { ...entry, rival: item.strength });
    }
  }

  // Without competitor: only show segments where Unity has data
  // With competitor: show all segments from both platforms
  const segments = [...segmentMap.entries()].filter(([, v]) =>
    competitor ? (v.unity !== undefined || v.rival !== undefined) : v.unity !== undefined
  );

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-white">Market Positioning</h3>
          <p className="text-sm text-gray-400">Segment strength analysis</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Unity legend — always visible */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-xs font-medium text-orange-400">Unity</span>
          </div>

          {/* Competitor legend — only when selected */}
          {competitor && (
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${ENGINE_DOT[competitor]}`} />
              <span className={`text-xs font-medium ${ENGINE_TEXT[competitor]}`}>{competitor}</span>
            </div>
          )}

          {/* Select competitor button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(p => !p)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                competitor
                  ? ENGINE_BADGE[competitor]
                  : 'text-gray-300 bg-gray-800 border-gray-600 hover:border-gray-400'
              }`}
            >
              {competitor ? (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${ENGINE_DOT[competitor]}`} />
                  {competitor}
                </>
              ) : (
                'Comparar con…'
              )}
              <span className="opacity-60">{showMenu ? '▲' : '▼'}</span>
            </button>

            <div className={`absolute right-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[160px] transition-all duration-200 origin-top ${
              showMenu ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-0 pointer-events-none'
            }`}>
              {COMPETITORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setCompetitor(c); setShowMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 transition-colors hover:bg-gray-700 ${ENGINE_TEXT[c]} ${competitor === c ? 'bg-gray-700' : ''}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${ENGINE_DOT[c]}`} />
                  {c}
                </button>
              ))}
              {competitor && (
                <button
                  onClick={() => { setCompetitor(null); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-700 border-t border-gray-700"
                >
                  Quitar comparativa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {segments.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-6">Sin datos disponibles.</p>
      )}

      {/* Segments grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {segments.map(([segment, { unity, rival }]) => {
          const unityVal  = unity  ?? null;
          const rivalVal  = rival  ?? null;

          return (
            <div key={segment} className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              {/* Segment name */}
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                {segment.replace(/_/g, ' ')}
              </p>

              {/* Unity row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span className="text-xs font-medium text-orange-400">Unity</span>
                  </div>
                  <span className="text-xs tabular-nums text-orange-300 font-semibold">
                    {unityVal !== null ? `${unityVal}%` : '—'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-orange-400 transition-all duration-500"
                    style={{ width: `${unityVal ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Competitor row — only when selected */}
              {competitor && (
                <>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${ENGINE_DOT[competitor]}`} />
                        <span className={`text-xs font-medium ${ENGINE_TEXT[competitor]}`}>{competitor}</span>
                      </div>
                      <span className={`text-xs tabular-nums font-semibold ${ENGINE_TEXT[competitor]}`}>
                        {rivalVal !== null ? `${rivalVal}%` : '—'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${ENGINE_BAR[competitor]}`}
                        style={{ width: `${rivalVal ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Comparison result — only when both have data */}
                  {unityVal !== null && rivalVal !== null && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-700">
                      <span className="text-xs text-gray-500">Unity vs {competitor}</span>
                      <div className="flex items-center gap-1">
                        <TrendArrow unity={unityVal} competitor={rivalVal} />
                        <span className={`text-xs tabular-nums font-medium ${
                          unityVal - rivalVal > 5 ? 'text-green-400' : unityVal - rivalVal < -5 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {unityVal - rivalVal > 0 ? '+' : ''}{(unityVal - rivalVal).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}