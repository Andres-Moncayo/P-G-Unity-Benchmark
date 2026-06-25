import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { AnalyticsFilterStrip } from '../../features/analytics/components/AnalyticsFilterStrip';
import { useAnalyticsBusinessFilter } from '../../features/analytics/context/AnalyticsBusinessFilterContext';
import { useRefreshAnalytics } from '../../features/analytics/hooks/useRefreshAnalytics';
import { useNavigationStore } from '../../store/useNavigationStore';

export function HeaderAnalyticsControls() {
  const [filterOpen, setFilterOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const { businessFilter } = useAnalyticsBusinessFilter();
  const refreshAnalytics = useRefreshAnalytics();
  const { currentPage, triggerMonitorizationRefresh } = useNavigationStore();
  const isRefreshing = useIsFetching({ queryKey: ['analytics'] }) > 0;
  const isMonitorization = currentPage === 'monitorization';
  const isMonitorizationRefreshing = useIsFetching({ queryKey: ['monitorization'] }) > 0;

  const handleRefresh = () => {
    if (isMonitorization) {
      triggerMonitorizationRefresh();
    } else {
      refreshAnalytics();
    }
  };

  const currentlyRefreshing = isMonitorization ? isMonitorizationRefreshing : isRefreshing;
  const hasActiveFilter = businessFilter !== 'General';

  const closeFilter = useCallback(() => {
    setPanelClosing(true);
    setFilterOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setPanelVisible(false);
      setPanelClosing(false);
      closeTimerRef.current = null;
    }, 220);
  }, []);

  const openFilter = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPanelClosing(false);
    setPanelVisible(true);
    setFilterOpen(true);
  }, []);

  const toggleFilter = () => {
    if (filterOpen) closeFilter();
    else openFilter();
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!filterOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        closeFilter();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFilter();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [filterOpen, closeFilter]);

  return (
    <div ref={controlsRef} className="flex shrink-0 items-center gap-2">
      <div className="header-filter-controls relative">
        <button
          type="button"
          onClick={toggleFilter}
          aria-expanded={filterOpen}
          aria-haspopup="listbox"
          className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm outline-none transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-700 focus-visible:ring-offset-0 ${
            filterOpen
              ? 'border-gray-700 bg-black text-white'
              : hasActiveFilter
                ? 'border-gray-700 bg-black/80 text-gray-200'
                : 'border-[#374151] bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <FilterIcon />
          <span className="relative inline-block text-left" style={{ minWidth: '5.75rem' }}>
            <span
              className={`block truncate transition-opacity duration-300 ease-out ${
                hasActiveFilter ? 'opacity-0' : 'opacity-100'
              }`}
              aria-hidden={hasActiveFilter}
            >
              Filter
            </span>
            <span
              className={`absolute inset-0 truncate transition-opacity duration-300 ease-out ${
                hasActiveFilter ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!hasActiveFilter}
            >
              {businessFilter}
            </span>
            <span className="sr-only">
              {hasActiveFilter ? businessFilter : 'Filter'}
            </span>
          </span>
          <ChevronIcon open={filterOpen} />
        </button>

        {panelVisible ? (
          <div
            className="header-filter-panel absolute right-0 top-[calc(100%+8px)] z-50 min-w-[320px] overflow-hidden rounded-xl border border-gray-800 bg-black px-2.5 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.65)]"
            data-state={panelClosing ? 'closing' : 'open'}
            role="region"
            aria-label="Strategic pillar filters"
            aria-hidden={!filterOpen}
          >
            <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-gray-500">
              Strategic pillar
            </p>
            <AnalyticsFilterStrip layout="horizontal" animateIn={!panelClosing} />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => void handleRefresh()}
        disabled={currentlyRefreshing}
        className="flex items-center gap-2 rounded-lg border border-[#374151] bg-white/5 px-4 py-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
      >
        <RefreshIcon spinning={currentlyRefreshing} />
        <span>{currentlyRefreshing ? 'Updating...' : 'Update'}</span>
      </button>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        open ? 'rotate-180' : 'rotate-0'
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
