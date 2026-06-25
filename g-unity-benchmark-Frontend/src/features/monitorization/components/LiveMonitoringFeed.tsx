import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { MonitorizationPost } from '../types';

const PAGE_SIZE = 10;

function getSentimentColor(label: string) {
  if (!label) return 'text-gray-300 bg-gray-800/70 border-gray-700';
  if (label.toLowerCase().includes('neg')) return 'text-red-200 bg-red-500/10 border-red-500/30';
  if (label.toLowerCase().includes('pos')) return 'text-emerald-200 bg-emerald-500/10 border-emerald-500/30';
  return 'text-gray-200 bg-gray-800/70 border-gray-700';
}

function getSentimentDotColor(label: string) {
  if (!label) return 'bg-gray-500';
  if (label.toLowerCase().includes('neg')) return 'bg-red-400';
  if (label.toLowerCase().includes('pos')) return 'bg-green-400';
  return 'bg-gray-400';
}

/** Normalizes sentiment labels from the API to English labels shown in the UI. */
function formatSentimentLabel(label: string): string {
  const raw = label.trim();
  if (!raw) return 'Neutral';
  const lower = raw.toLowerCase();
  if (lower === 'negativo' || lower === 'negative' || lower === 'neg') return 'Negative';
  if (lower === 'positivo' || lower === 'positive' || lower === 'pos') return 'Positive';
  if (lower === 'neutral' || lower === 'neutro') return 'Neutral';
  if (lower.includes('negativ')) return 'Negative';
  if (lower.includes('positiv')) return 'Positive';
  return raw;
}

/** Maps common Spanish category strings from the API to English; unknown values pass through unchanged. */
function formatBusinessLabel(business: string | undefined): string {
  if (!business) return 'General';
  const key = business.trim().toLowerCase();
  const map: Record<string, string> = {
    producto: 'Product',
    general: 'General',
    finanzas: 'Finance',
    posicionamiento: 'Positioning',
    ecosistema: 'Ecosystem',
    noticia: 'News',
    noticias: 'News',
    foro: 'Forum',
    foros: 'Forums',
    competidor: 'Competitor',
    competidores: 'Competitors',
    bug: 'Bug',
    bugs: 'Bugs',
    alerta: 'Alert',
    alertas: 'Alerts',
  };
  return map[key] ?? business;
}

function formatPlatformLabel(platform: string | undefined): string {
  if (!platform) return 'Unknown platform';
  const key = platform.trim().toLowerCase();
  const map: Record<string, string> = {
    unity: 'Unity',
    unreal: 'Unreal',
    godot: 'Godot',
    official: 'Official',
    reddit: 'Reddit',
    forum: 'Forum',
    forums: 'Forums',
  };
  return map[key] ?? platform;
}

function formatBugLabel(bug: string | undefined): string {
  if (!bug) return '';
  const raw = bug.trim();
  if (!raw) return '';
  const map: Record<string, string> = {
    crash: 'Crash',
    performance: 'Performance',
    memory: 'Memory',
    graphics: 'Graphics',
    audio: 'Audio',
    networking: 'Networking',
    ui: 'UI',
    input: 'Input',
  };
  return map[raw.toLowerCase()] ?? raw;
}

function normalizeBugValue(bug: string | null | undefined): string | null {
  const raw = bug?.trim().toLowerCase() ?? '';
  if (!raw || raw === 'none' || raw === 'null' || raw === 'n/a') return null;
  return bug?.trim() ?? null;
}

function stripVisibleIdPrefix(text: string): string {
  const value = text.trim();
  return value.replace(
    /^(?:id|post|post id|post_id)?\s*[:#-]?\s*\d+\s*[-:–—]?\s*/i,
    '',
  );
}

export function LiveMonitoringFeed({ posts = [], loading = false }: { posts: MonitorizationPost[]; loading: boolean }) {
  const [page, setPage] = useState(0);

  // Map API posts to the table row shape used by this UI
  const feedItems = posts && posts.length > 0
    ? posts.map((p: MonitorizationPost) => ({
        source: p.source.platform || (p.url ? new URL(p.url).hostname : 'Unknown source'),
        time: p.date ? new Date(p.date).toLocaleString('en-US') : '—',
        business: p.business_category || 'General',
        sentiment: p.sentiment.label || 'neutral',
        platform: p.platform_mentioned || 'unity',
        bug: normalizeBugValue(p.bug || p.technical_analysis?.bug_category || null),
        title: stripVisibleIdPrefix(p.title || p.summary || 'Untitled'),
        relevance: Math.min(100, Math.round(Math.abs((p.business_metrics?.churn_probability ?? 0.5) * 100))),
      }))
    : [];

  const totalPages = Math.max(1, Math.ceil(feedItems.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1));
  }, [totalPages]);

  const visibleItems = feedItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const rangeStart = feedItems.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = feedItems.length === 0 ? 0 : Math.min((page + 1) * PAGE_SIZE, feedItems.length);

  return (
    <div className="overflow-hidden rounded-[14px] border border-gray-700/70 bg-linear-to-b from-gray-900 via-gray-900 to-gray-950 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_42px_rgba(0,0,0,0.28)]">
      <div className="border-b border-gray-700/70 px-4 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_14px_rgba(34,211,238,0.5)]"></span>
          Real-Time Monitoring
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Automated extraction from forums, news, and reports across the gaming sector
        </p>
      </div>

      <div className="divide-y divide-gray-800/80">
        {loading && (
          <div className="p-6 space-y-4" role="status" aria-live="polite" aria-busy="true">
            <div className="flex items-center gap-4">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                <span className="absolute h-11 w-11 rounded-full bg-cyan-500/10 animate-ping" />
                <span className="absolute h-11 w-11 rounded-full border border-cyan-400/30 animate-pulse" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">Loading feed</p>
                <p className="text-xs text-gray-500 mt-0.5">Fetching the latest posts…</p>
                <span className="mt-2 flex gap-1.5" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-cyan-400/80 animate-bounce"
                      style={{ animationDelay: `${i * 140}ms` }}
                    />
                  ))}
                </span>
              </div>
            </div>
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className="relative overflow-hidden rounded-lg border border-gray-700/70 bg-white/3 p-4 shadow-inner"
              >
                <div className="mb-3 h-3.5 w-[32%] max-w-50 rounded-md bg-gray-600/60" />
                <div className="mb-2 h-2.5 w-full rounded-md bg-gray-700/45" />
                <div className="mb-2 h-2.5 w-[92%] rounded-md bg-gray-700/45" />
                <div className="h-2.5 w-[40%] rounded-md bg-gray-700/35" />
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-cyan-300/10 to-transparent animate-feed-loader-shimmer"
                  aria-hidden
                />
              </div>
            ))}
          </div>
        )}

        {!loading &&
          visibleItems.map((item: any, index: number) => (
            <div
              key={`${item.source}-${item.time}-${item.title}-${index}`}
              className="animate-feed-row-enter p-4 transition-colors hover:bg-white/3"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 shrink-0 h-3 w-3 rounded-full ${getSentimentDotColor(item.sentiment)}`} aria-hidden="true">
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-white">{item.source}</span>
                    <span className="text-sm text-cyan-300/70">•</span>
                    <span className="text-sm text-gray-400">{item.time}</span>
                  </div>

                  <h3 className="text-white text-lg font-medium mb-2">{item.title}</h3>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-1 py-0.5 text-xs rounded border ${getSentimentColor(item.sentiment)}`}>
                      {formatSentimentLabel(item.sentiment)}
                    </span>
                    <span className="rounded border border-cyan-400/15 bg-cyan-500/10 px-1 py-0.5 text-xs text-cyan-200">
                      {formatPlatformLabel(item.platform)}
                    </span>
                    <span className="rounded border border-blue-400/15 bg-blue-500/10 px-1 py-0.5 text-xs text-blue-200">
                      {formatBusinessLabel(item.business)}
                    </span>
                    {item.bug && (
                      <>
                        <span className="rounded border border-amber-400/20 bg-amber-500/10 px-1 py-0.5 text-xs text-amber-200">
                          Bug
                        </span>
                        <span className="rounded border border-violet-400/20 bg-violet-500/10 px-1 py-0.5 text-xs text-violet-200">
                          {formatBugLabel(item.bug)}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2" />
                </div>
              </div>
            </div>
          ))}

        {!loading && feedItems.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-400">
            No posts match the current search or sentiment filter.
          </div>
        )}
      </div>

      {!loading && feedItems.length > 0 && (
        <div className="flex items-center justify-between gap-4 border-t border-gray-700/70 bg-white/2 px-4 py-3">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-700 bg-white/3 text-white transition-colors hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4 cursor-pointer" aria-hidden />
          </button>
          <p className="min-w-0 flex-1 text-center text-sm text-gray-400">
            {rangeStart}–{rangeEnd} of {feedItems.length}
            <span className="text-cyan-300/40"> · </span>
            Page {page + 1} / {totalPages}
          </p>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-700 bg-white/3 text-white transition-colors hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-white disabled:pointer-events-none disabled:opacity-40"
          >
            <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4 cursor-pointer" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}