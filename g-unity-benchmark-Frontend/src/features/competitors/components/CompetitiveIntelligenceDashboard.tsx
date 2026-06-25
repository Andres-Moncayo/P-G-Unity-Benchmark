import { useState } from 'react';
import { RevenueComparison } from './RevenueComparison';
import { CompetitivePulse } from './CompetitivePulse';
import { CriticalAlerts } from './CriticalAlerts';
import { CompetitorMetricsGrid } from './CompetitorMetricsGrid';
import { MarketPositioning } from './MarketPositioning';
import { StrategicInitiatives } from './StrategicInitiatives';
import { RecentCompetitorMoves } from './RecentCompetitorMoves';
import { useCompetitorsData, type EngineMetric } from '../hooks/useCompetitorsData';

export function CompetitiveIntelligenceDashboard() {
  const { data, isLoading, isError, error } = useCompetitorsData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading competitive intelligence...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
        Error loading competitor data:{' '}
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics Grid */}
      <CompetitorMetricsGrid summary={data.summary} engines={data.engines} />

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueComparison />
        <CompetitivePulse pulse={data.pulse} />
      </div>

      {/* Market Positioning — full width */}
      <MarketPositioning />

      {/* Strategic Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StrategicInitiatives />
        <RecentCompetitorMoves posts={data.recent_posts} />
      </div>

      {/* Competitor Deep Dive — tarjeta unificada */}
      <EngineDeepDiveCard engines={data.engines} />

      {/* Critical Alerts */}
      <CriticalAlerts alerts={data.critical_alerts} />
    </div>
  );
}

// ── Configuración estática por motor ────────────────────────────────────────

const ENGINE_CONFIG: Record<string, {
  label: string;
  dot: string;
  accent: string;
  border: string;
  threatBox: string;
  threatText: string;
  threatLabel: string;
  threats: string[];
}> = {
  unreal: {
    label:       'Unreal Engine - Deep Analysis',
    dot:         'bg-blue-500',
    accent:      'text-blue-400',
    border:      'border-blue-700',
    threatBox:   'bg-blue-900/20 border-blue-700',
    threatText:  'text-blue-400',
    threatLabel: 'Key Threat Areas',
    threats: [
      'AAA dominance increasing',
      'Unreal Engine 5 accelerating adoption',
      'Metaverse investments attracting enterprise',
      'Epic Games Store ecosystem expansion',
    ],
  },
  godot: {
    label:       'Godot Engine - Rising Threat',
    dot:         'bg-green-500',
    accent:      'text-green-400',
    border:      'border-green-700',
    threatBox:   'bg-red-900/20 border-red-700',
    threatText:  'text-red-400',
    threatLabel: 'Critical Impact Indicators',
    threats: [
      'Indie migration from Unity accelerating',
      'Godot 4.0 closing feature gap',
      'Studios exploring Godot as alternative',
      'Educational institutions adopting Godot',
    ],
  },
  unity: {
    label:       'Unity - Market Position',
    dot:         'bg-orange-500',
    accent:      'text-orange-400',
    border:      'border-orange-700',
    threatBox:   'bg-orange-900/20 border-orange-700',
    threatText:  'text-orange-400',
    threatLabel: 'Competitive Advantages',
    threats: [
      'Largest asset ecosystem in the market',
      'Dominance in mobile gaming (iOS/Android)',
      'Wide community and documentation',
      'Established cross-platform versatility',
    ],
  },
};

type EngineKey = 'unreal' | 'godot' | 'unity';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildMetrics(e: EngineMetric) {
  const total        = e.post_count || 1;
  const sentimentPct = Math.round((e.positive_count  / total) * 100);
  const negativePct  = Math.round((e.negative_count  / total) * 100);
  const churnPct     = Math.round((e.churn_risk_count / total) * 100);
  return [
    { metric: 'Posts Analizados',     value: String(e.post_count),      sub: `${sentimentPct}% positivos`,              up: sentimentPct >= 50 },
    { metric: 'Sentimiento Negativo', value: `${negativePct}%`,          sub: `${e.negative_count} posts`,               up: negativePct <= 40 },
    { metric: 'NPS Score',            value: `${e.nps_score} pts`,       sub: e.nps_score >= 0 ? 'Positivo' : 'Negativo', up: e.nps_score >= 0 },
    { metric: 'Riesgo de Churn',      value: `${churnPct}%`,             sub: `${e.churn_risk_count} posts`,             up: churnPct <= 20 },
    { metric: 'Alertas Altas',        value: String(e.high_alerts),      sub: `${e.medium_alerts} medias`,               up: e.high_alerts === 0 },
    { metric: 'Promotores',           value: String(e.promotor_total),   sub: `${e.detractor_total} detractores`,        up: e.promotor_total >= e.detractor_total },
  ];
}

function buildComparison(a: EngineMetric, b: EngineMetric) {
  const aT = a.post_count || 1;
  const bT = b.post_count || 1;
  const aSent = Math.round((a.positive_count  / aT) * 100);
  const bSent = Math.round((b.positive_count  / bT) * 100);
  const aChurn = Math.round((a.churn_risk_count / aT) * 100);
  const bChurn = Math.round((b.churn_risk_count / bT) * 100);

  type W = 'a' | 'b' | 'equal';
  const cmp = (va: number, vb: number, higherIsBetter = true): W =>
    va === vb ? 'equal' : (higherIsBetter ? va > vb : va < vb) ? 'a' : 'b';

  return [
    { metric: 'Posts Analizados',     va: String(a.post_count),    vb: String(b.post_count),    w: cmp(a.post_count,    b.post_count) },
    { metric: 'Sentimiento Positivo', va: `${aSent}%`,             vb: `${bSent}%`,             w: cmp(aSent, bSent) },
    { metric: 'NPS Score',            va: `${a.nps_score} pts`,    vb: `${b.nps_score} pts`,    w: cmp(a.nps_score,    b.nps_score) },
    { metric: 'Riesgo de Churn',      va: `${aChurn}%`,            vb: `${bChurn}%`,            w: cmp(aChurn, bChurn, false) },
    { metric: 'Alertas Altas',        va: String(a.high_alerts),   vb: String(b.high_alerts),   w: cmp(a.high_alerts,  b.high_alerts, false) },
    { metric: 'Promotores',           va: String(a.promotor_total), vb: String(b.promotor_total), w: cmp(a.promotor_total, b.promotor_total) },
  ];
}

// ── Tarjeta unificada ─────────────────────────────────────────────────────────

interface DeepDiveCardProps {
  engines: EngineMetric[];
}

function EngineDeepDiveCard({ engines }: DeepDiveCardProps) {
  const [activeTab, setActiveTab]             = useState<EngineKey>('unreal');
  const [showEngineMenu, setShowEngineMenu]   = useState(false);
  const [compareWith, setCompareWith]         = useState<string | null>(null);
  const [showCompareMenu, setShowCompareMenu] = useState(false);

  const findEngine = (key: string) =>
    engines.find(e => e.platform.toLowerCase().includes(key));

  const current = findEngine(activeTab);
  const cfg     = ENGINE_CONFIG[activeTab];

  // Opciones de comparación: todos los motores excepto el activo
  const ALL_ENGINES = [
    { key: 'unity',  label: 'Unity',         color: 'text-orange-400' },
    { key: 'unreal', label: 'Unreal Engine',  color: 'text-blue-400'  },
    { key: 'godot',  label: 'Godot Engine',   color: 'text-green-400' },
  ];
  const compareOptions = ALL_ENGINES.filter(o => o.key !== activeTab);

  const compareEngine = compareWith ? findEngine(compareWith) : null;
  const compareLabel  = compareOptions.find(o => o.key === compareWith)?.label ?? '';
  const comparePanelOpen = !!compareWith && !!compareEngine;

  const metrics    = current ? buildMetrics(current) : [];
  const comparison = current && compareEngine ? buildComparison(current, compareEngine) : [];

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">

      {/* ── Header con tabs + botón comparar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-wrap gap-3">

        {/* Select motor activo */}
        <div className="relative">
          <button
            onClick={() => { setShowEngineMenu(prev => !prev); setShowCompareMenu(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${cfg.accent} bg-gray-800 ${cfg.border}`}
          >
            <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            {activeTab === 'unreal' ? 'Unreal Engine' : activeTab === 'godot' ? 'Godot Engine' : 'Unity'}
            <span className="text-xs opacity-70">{showEngineMenu ? '▲' : '▼'}</span>
          </button>

          <div className={`absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[160px] transition-all duration-200 origin-top ${
            showEngineMenu ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-75 pointer-events-none'
          }`}>
            {(['unreal', 'godot', 'unity'] as EngineKey[]).map(key => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); setCompareWith(null); setShowEngineMenu(false); setShowCompareMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors hover:bg-gray-700 ${ENGINE_CONFIG[key].accent} ${activeTab === key ? 'bg-gray-700' : ''}`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ENGINE_CONFIG[key].dot}`} />
                {key === 'unreal' ? 'Unreal Engine' : key === 'godot' ? 'Godot Engine' : 'Unity'}
              </button>
            ))}
          </div>
        </div>

        {/* Botón comparar con selector */}
        <div className="relative">
          <button
            onClick={() => setShowCompareMenu(prev => !prev)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              compareWith
                ? 'text-white bg-blue-600 border-blue-500'
                : 'text-gray-300 border-gray-600 hover:border-gray-400 hover:bg-gray-800'
            }`}
          >
            ⚖ {compareWith ? `vs ${compareLabel}` : 'Comparar con…'}
            <span className="text-xs opacity-70">{showCompareMenu ? '▲' : '▼'}</span>
          </button>

          <div className={`absolute right-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[160px] transition-all duration-200 origin-top ${
            showCompareMenu ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-75 pointer-events-none'
          }`}>
            {compareOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => { setCompareWith(opt.key); setShowCompareMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-700 ${opt.color} ${compareWith === opt.key ? 'bg-gray-700' : ''}`}
              >
                {opt.label}
              </button>
            ))}
            {compareWith && (
              <button
                onClick={() => { setCompareWith(null); setShowCompareMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-700 border-t border-gray-700"
              >
                Quitar comparativa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cuerpo: panel principal + panel comparativo ── */}
      <div className="flex overflow-hidden">

        {/* Panel principal del motor activo */}
        <div
          className="flex-shrink-0 p-6 space-y-3 transition-all duration-500"
          style={{ width: comparePanelOpen ? '50%' : '100%' }}
        >
          <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${cfg.accent}`}>{cfg.label}</p>

          {!current ? (
            <p className="text-gray-500 text-sm">Sin datos disponibles. Genera posts con /ia-posts.</p>
          ) : (
            <>
              {metrics.map((item, i) => {
                const ref  = comparison[i];
                const wins  = comparePanelOpen && ref?.w === 'a';
                const loses = comparePanelOpen && ref?.w === 'b';
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <span className="text-gray-300 text-sm">{item.metric}</span>
                    <div className="text-right">
                      <div className={`font-semibold flex items-center justify-end gap-1 ${
                        wins ? cfg.accent : loses ? 'text-red-400' : 'text-white'
                      }`}>
                        {item.value}
                        {wins && <span className="text-xs">▲</span>}
                      </div>
                      <div className={`text-xs ${item.up ? 'text-green-400' : 'text-red-400'}`}>
                        {item.up ? '↑' : '↓'} {item.sub}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className={`mt-2 p-3 ${cfg.threatBox} border rounded-lg`}>
                <p className={`${cfg.threatText} text-sm font-medium`}>{cfg.threatLabel}</p>
                <ul className="text-gray-300 text-sm mt-2 space-y-1">
                  {cfg.threats.map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Panel comparativo — mismo diseño que el izquierdo, slide desde la derecha */}
        <div
          className={`flex-shrink-0 border-l border-gray-700 p-6 space-y-3 transition-all duration-500 overflow-hidden ${
            comparePanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ width: comparePanelOpen ? '50%' : '0%' }}
        >
          {comparePanelOpen && compareEngine && current && (() => {
            const cmpKey   = compareWith as string;
            const cmpCfg   = ENGINE_CONFIG[cmpKey];
            const cmpColor = compareOptions.find(o => o.key === cmpKey)?.color ?? 'text-gray-400';
            const cmpMetrics = buildMetrics(compareEngine);

            return (
              <>
                <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${cmpColor}`}>
                  {cmpCfg.label}
                </p>

                {cmpMetrics.map((item, i) => {
                  const ref  = comparison[i];
                  const wins = ref?.w === 'b';
                  const loses = ref?.w === 'a';
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <span className="text-gray-300 text-sm">{item.metric}</span>
                      <div className="text-right">
                        <div className={`font-semibold flex items-center justify-end gap-1 ${
                          wins ? cmpColor : loses ? 'text-red-400' : 'text-white'
                        }`}>
                          {item.value}
                          {wins && <span className="text-xs">▲</span>}
                        </div>
                        <div className={`text-xs ${item.up ? 'text-green-400' : 'text-red-400'}`}>
                          {item.up ? '↑' : '↓'} {item.sub}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className={`mt-2 p-3 ${cmpCfg.threatBox} border rounded-lg`}>
                  <p className={`${cmpCfg.threatText} text-sm font-medium`}>{cmpCfg.threatLabel}</p>
                  <ul className="text-gray-300 text-sm mt-2 space-y-1">
                    {cmpCfg.threats.map((t, i) => <li key={i}>• {t}</li>)}
                  </ul>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
