import { useState } from 'react';
import { useStrategicInitiatives } from '../hooks/useCompetitorsData';


// Fondo/borde de la tarjeta según nivel de alerta (impact)
const CARD_COLORS: Record<string, string> = {
  critical: 'bg-red-900/25 border border-red-700',
  high:     'bg-red-900/25 border border-red-700',
  medium:   'bg-yellow-900/25 border border-yellow-700',
  low:      'bg-green-900/25 border border-green-700',
};

// Texto secundario contrastado según impact
const MUTED_TEXT: Record<string, string> = {
  critical: 'text-red-200',
  high:     'text-red-200',
  medium:   'text-yellow-200',
  low:      'text-green-200',
};

const IMPACT_BADGE: Record<string, string> = {
  critical: 'text-red-900 bg-red-400 font-bold',
  high:     'text-red-900 bg-red-400 font-bold',
  medium:   'text-yellow-900 bg-yellow-400 font-semibold',
  low:      'text-green-900 bg-green-400',
};

export function StrategicInitiatives() {
  const { data, isLoading, isError } = useStrategicInitiatives();
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Strategic Initiatives</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Strategic Initiatives</h3>
        <p className="text-red-400 text-sm">Error cargando datos.</p>
      </div>
    );
  }

  // Exclude items with no meaningful title
  const filtered  = data.filter(i => i.initiative && i.initiative.trim() !== '');
  const companies = Array.from(new Set(filtered.map(i => i.company))).sort();

  const visible = filtered.filter(item =>
    companyFilter === 'all' || item.company === companyFilter
  );

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-1">Strategic Initiatives</h3>
      <p className="text-sm text-gray-400 mb-4">Competitive initiatives tracking</p>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">

        {/* Select empresa */}
        <div className="relative">
          <button
            onClick={() => setShowCompanyMenu(p => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              companyFilter !== 'all'
                ? 'text-white bg-gray-700 border-gray-400'
                : 'text-gray-300 bg-gray-800 border-gray-600 hover:border-gray-400'
            }`}
          >
            {companyFilter === 'all' ? 'Plataforma' : companyFilter}
            <span className="opacity-60">{showCompanyMenu ? '▲' : '▼'}</span>
          </button>
          <div className={`absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[160px] transition-all duration-200 origin-top ${
            showCompanyMenu ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-75 pointer-events-none'
          }`}>
            <button onClick={() => { setCompanyFilter('all'); setShowCompanyMenu(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 ${companyFilter === 'all' ? 'bg-gray-700' : ''}`}>
              Todas
            </button>
            {companies.map(c => (
              <button key={c} onClick={() => { setCompanyFilter(c); setShowCompanyMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 ${companyFilter === c ? 'bg-gray-700' : ''}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

      </div>

      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
        {visible.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No initiatives for selected filters.</p>
        )}
        {visible.map((item) => (
          <div key={item.id} className={`p-3 rounded-lg ${CARD_COLORS[item.impact] ?? 'bg-gray-800 border border-gray-700'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 pr-2">
                <div className="text-sm font-medium text-white">{item.company}</div>
                <div className={`text-xs mt-1 line-clamp-2 ${MUTED_TEXT[item.impact] ?? 'text-gray-400'}`}>{item.initiative}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 capitalize ${IMPACT_BADGE[item.impact] ?? 'text-gray-400 bg-gray-700'}`}>
                {item.impact}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-xs ${MUTED_TEXT[item.impact] ?? 'text-gray-400'}`}>{formatDate(item.timeline)}</span>
              {item.source_url && (
                <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  Ver →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}