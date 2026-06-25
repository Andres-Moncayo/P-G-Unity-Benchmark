import { useState } from 'react';
import type { AlertItem } from '../hooks/useCompetitorsData';

interface Props {
  alerts: AlertItem[];
}

const severityMap: Record<string, { border: string; bg: string; icon: string; label: string }> = {
  high:   { border: 'border-red-700',    bg: 'bg-red-900/20',    icon: '🔴', label: 'Alto' },
  medium: { border: 'border-yellow-700', bg: 'bg-yellow-900/20', icon: '🟡', label: 'Medio' },
  low:    { border: 'border-gray-700',   bg: 'bg-gray-800/50',   icon: '🟢', label: 'Bajo' },
};

const IMPACT_OPTIONS = [
  { value: 'all',    label: 'Todos',  color: 'text-gray-300',  activeBg: 'bg-gray-700 border-gray-500'    },
  { value: 'high',   label: 'Alto',   color: 'text-red-400',   activeBg: 'bg-red-900/40 border-red-600'   },
  { value: 'medium', label: 'Medio',  color: 'text-yellow-400',activeBg: 'bg-yellow-900/40 border-yellow-600' },
  { value: 'low',    label: 'Bajo',   color: 'text-green-400', activeBg: 'bg-green-900/40 border-green-600'  },
];

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function CriticalAlerts({ alerts }: Props) {
  const [open, setOpen]         = useState(true);
  const [impact, setImpact]     = useState('all');

  const validAlerts = alerts.filter(a => a.title && a.title.trim() !== '' || a.summary);
  const critical    = validAlerts.filter(a => a.alert_type === 'high').length;

  const filtered = validAlerts.filter(a =>
    impact === 'all' ? true : a.alert_type === impact
  );

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="text-lg font-semibold text-white">Critical Strategic Alerts</h3>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-red-600/20 border border-red-600 rounded-full text-red-400 text-sm">
            {critical} critical
          </span>
          <button
            onClick={() => setOpen(prev => !prev)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm"
            title={open ? 'Close' : 'Open'}
          >
            {open ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Preview cerrado: 2 primeras alertas */}
      {!open && (
        <div className="px-6 pb-4 space-y-3">
          {validAlerts.slice(0, 2).map((alert) => {
            const style = severityMap[alert.alert_type] ?? severityMap.low;
            return (
              <div key={alert.id} className={`p-3 rounded-lg border ${style.border} ${style.bg} flex items-center gap-3`}>
                <span>{style.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-white text-sm font-medium truncate block">{alert.title || alert.summary}</span>
                  <span className="text-gray-400 text-xs capitalize">{alert.platform} · Impacto {style.label}</span>
                </div>
              </div>
            );
          })}
          {validAlerts.length > 2 && (
            <p className="text-gray-600 text-xs text-center">+{validAlerts.length - 2} alertas más</p>
          )}
        </div>
      )}

      {/* Cuerpo completo desplegable */}
      <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>

        {/* Filtro por impacto */}
        <div className="px-6 pb-4 flex items-center gap-2 flex-wrap">
          {IMPACT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setImpact(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                impact === opt.value
                  ? `${opt.color} ${opt.activeBg}`
                  : 'text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
              <span className="ml-1.5 opacity-60">
                {opt.value === 'all' ? validAlerts.length : validAlerts.filter(a => a.alert_type === opt.value).length}
              </span>
            </button>
          ))}
        </div>

        {/* Lista completa */}
        <div className="px-6 pb-6 max-h-[480px] overflow-y-auto space-y-4 pr-3">
          {filtered.map((alert) => {
            const style = severityMap[alert.alert_type] ?? severityMap.low;
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${style.border} ${style.bg}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{style.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-white capitalize">{alert.platform}</span>
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                        Impact: {style.label}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400 capitalize">
                        {alert.sentimental}
                      </span>
                    </div>
                    {alert.title && <p className="text-white text-sm font-medium mb-1">{alert.title}</p>}
                    {alert.summary && (
                      <p className="text-gray-300 text-sm leading-relaxed">{alert.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {alert.date_post && (
                        <span className="text-gray-500 text-xs">{formatDate(alert.date_post)}</span>
                      )}
                      {alert.url && (
                        <a
                          href={alert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 text-xs hover:underline"
                        >
                          Ver fuente →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              {impact !== 'all' ? 'No alerts for this impact level.' : 'No active alerts. Generate posts to detect signals.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}