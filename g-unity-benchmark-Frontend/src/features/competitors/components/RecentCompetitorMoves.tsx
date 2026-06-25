import { useState } from 'react';
import type { RecentPostItem } from '../hooks/useCompetitorsData';

interface Props {
  posts: RecentPostItem[];
}

const sentimentColors: Record<string, string> = {
  positive: 'border border-green-700 bg-green-900/20',
  negative: 'border border-red-700 bg-red-900/20',
  neutral:  'border border-gray-600 bg-gray-800/50',
};

const SENTIMENTAL_BADGE: Record<string, string> = {
  positive: 'text-emerald-900 bg-emerald-400',
  negative: 'text-rose-100   bg-rose-600',
  neutral:  'text-gray-200   bg-gray-600',
};

export function RecentCompetitorMoves({ posts }: Props) {
  const [platformFilter,    setPlatformFilter]    = useState<string>('all');
  const [sentimentFilter,   setSentimentFilter]   = useState<string>('all');
  const [showPlatformMenu,  setShowPlatformMenu]  = useState(false);
  const [showSentimentMenu, setShowSentimentMenu] = useState(false);

  const validPosts = posts.filter(p => p.title && p.title.trim() !== '');
  const platforms  = Array.from(new Set(validPosts.map(p => p.platform))).sort();
  const sentiments = ['positive', 'negative', 'neutral'];

  const visible = validPosts.filter(p =>
    (platformFilter  === 'all' || p.platform   === platformFilter) &&
    (sentimentFilter === 'all' || p.sentimental === sentimentFilter)
  );

  const formatDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-1">Recent Competitor Moves</h3>
      <p className="text-sm text-gray-400 mb-4">Últimos posts analizados de competidores</p>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">

        {/* Select empresa */}
        <div className="relative">
          <button
            onClick={() => { setShowPlatformMenu(p => !p); setShowSentimentMenu(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              platformFilter !== 'all'
                ? 'text-white bg-gray-700 border-gray-400'
                : 'text-gray-300 bg-gray-800 border-gray-600 hover:border-gray-400'
            }`}
          >
            {platformFilter === 'all' ? 'Empresa' : platformFilter}
            <span className="opacity-60">{showPlatformMenu ? '▲' : '▼'}</span>
          </button>
          <div className={`absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[140px] transition-all duration-200 origin-top ${
            showPlatformMenu ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-75 pointer-events-none'
          }`}>
            <button
              onClick={() => { setPlatformFilter('all'); setShowPlatformMenu(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 ${platformFilter === 'all' ? 'bg-gray-700' : ''}`}
            >
              Todas
            </button>
            {platforms.map(pl => (
              <button
                key={pl}
                onClick={() => { setPlatformFilter(pl); setShowPlatformMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs text-gray-300 capitalize transition-colors hover:bg-gray-700 ${platformFilter === pl ? 'bg-gray-700' : ''}`}
              >
                {pl}
              </button>
            ))}
          </div>
        </div>

        {/* Select sentimental */}
        <div className="relative">
          <button
            onClick={() => { setShowSentimentMenu(p => !p); setShowPlatformMenu(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              sentimentFilter !== 'all'
                ? `${SENTIMENTAL_BADGE[sentimentFilter] ?? 'text-white bg-gray-700'} border-transparent`
                : 'text-gray-300 bg-gray-800 border-gray-600 hover:border-gray-400'
            }`}
          >
            {sentimentFilter === 'all' ? 'Sentimental' : sentimentFilter}
            <span className="opacity-60">{showSentimentMenu ? '▲' : '▼'}</span>
          </button>
          <div className={`absolute left-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[140px] transition-all duration-200 origin-top ${
            showSentimentMenu ? 'opacity-100 scale-y-100 pointer-events-auto' : 'opacity-0 scale-y-75 pointer-events-none'
          }`}>
            <button
              onClick={() => { setSentimentFilter('all'); setShowSentimentMenu(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 ${sentimentFilter === 'all' ? 'bg-gray-700' : ''}`}
            >
              Todos
            </button>
            {sentiments.map(s => (
              <button
                key={s}
                onClick={() => { setSentimentFilter(s); setShowSentimentMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-xs capitalize transition-colors hover:bg-gray-700 ${SENTIMENTAL_BADGE[s] ?? 'text-gray-300'} ${sentimentFilter === s ? 'opacity-90' : 'bg-transparent text-gray-300'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Lista */}
      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
        {visible.map((post) => {
          const color = sentimentColors[post.sentimental ?? 'neutral'] ?? 'border border-gray-600 bg-gray-800/50';
          const date  = formatDate(post.date_post);
          return (
            <div key={post.id} className={`p-3 rounded-lg ${color}`}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white capitalize">{post.platform}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 capitalize">{post.alert_type}</span>
                  </div>
                  <div className="text-xs text-gray-300 mt-1 line-clamp-2">{post.title}</div>
                  {post.summary && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-1">{post.summary}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SENTIMENTAL_BADGE[post.sentimental] ?? 'text-gray-400 bg-gray-700'}`}>
                  {post.sentimental}
                </span>
                {post.bug && <span className="text-xs text-amber-400 capitalize">{post.bug.replace(/_/g, ' ')}</span>}
                <div className="flex items-center gap-2 ml-auto">
                  {date && <span className="text-xs text-gray-500">{date}</span>}
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                      Ver →
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">
            {posts.length === 0
              ? 'Sin movimientos recientes. Genera posts con /ia-posts/addpost*.'
              : 'Sin resultados para los filtros seleccionados.'}
          </p>
        )}
      </div>
    </div>
  );
}