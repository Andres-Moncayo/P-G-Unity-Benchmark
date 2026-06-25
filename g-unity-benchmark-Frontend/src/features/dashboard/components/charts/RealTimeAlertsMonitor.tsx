import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../../utils/cn";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
  DASHBOARD_METRIC_FOOTER_CLASS,
  DASHBOARD_METRIC_HEADER_CHART_GAP_CLASS,
} from "./DashboardViewToggle";
import {
  DASHBOARD_INTELLIGENCE_CARD_BODY_CLASS,
  DASHBOARD_INTELLIGENCE_CARD_FOOTER_CLASS,
  DASHBOARD_INTELLIGENCE_CARD_SLOT_CLASS,
  DASHBOARD_INTELLIGENCE_CARD_TITLE_CLASS,
  DASHBOARD_INTELLIGENCE_ITEMS_PER_PAGE,
  IntelligenceEmptySlot,
  IntelligenceListFrame,
  IntelligenceListOverlay,
  padToPageSize,
} from "./intelligenceListLayout";
import { useRealtimeMonitor } from "../../hooks/useRealtimeMonitor";

export const REALTIME_SOURCE_STATS = [
  { key: "feeds", label: "Feeds", color: "text-[#7DD3FC]" },
  { key: "forums", label: "Forums", color: "text-[#C4B5FD]" },
  { key: "news", label: "News", color: "text-[#6EE7B7]" },
  { key: "reports", label: "Reports", color: "text-[#7DD3FC]" },
  { key: "social", label: "Social", color: "text-[#FCD34D]" },
] as const;

const ITEMS_PER_PAGE = DASHBOARD_INTELLIGENCE_ITEMS_PER_PAGE;

export type MonitorCategoryFilter =
  | "all"
  | "product"
  | "finance"
  | "positioning"
  | "ecosystem"
  | "general";

const MONITOR_CATEGORY_FILTERS: {
  key: MonitorCategoryFilter;
  label: string;
  dot: string;
  text: string;
  badge: string;
}[] = [
  {
    key: "all",
    label: "All",
    dot: "bg-[#94A3B8]",
    text: "text-[#94A3B8]",
    badge: "text-gray-300 bg-gray-900 border-gray-600",
  },
  {
    key: "product",
    label: "Product",
    dot: "bg-[#7DD3FC]",
    text: "text-[#7DD3FC]",
    badge: "text-[#7DD3FC] bg-sky-950 border-sky-700",
  },
  {
    key: "finance",
    label: "Finance",
    dot: "bg-[#6EE7B7]",
    text: "text-[#6EE7B7]",
    badge: "text-[#6EE7B7] bg-emerald-950 border-emerald-700",
  },
  {
    key: "positioning",
    label: "Positioning",
    dot: "bg-[#C4B5FD]",
    text: "text-[#C4B5FD]",
    badge: "text-[#C4B5FD] bg-violet-950 border-violet-700",
  },
  {
    key: "ecosystem",
    label: "Ecosystem",
    dot: "bg-[#FCD34D]",
    text: "text-[#FCD34D]",
    badge: "text-[#FCD34D] bg-amber-950 border-amber-700",
  },
  {
    key: "general",
    label: "General",
    dot: "bg-[#94A3B8]",
    text: "text-[#94A3B8]",
    badge: "text-gray-300 bg-gray-900 border-gray-600",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Producto: "bg-[#7DD3FC]/10 text-[#7DD3FC]",
  Product: "bg-[#7DD3FC]/10 text-[#7DD3FC]",
  Finanzas: "bg-[#6EE7B7]/10 text-[#6EE7B7]",
  Finance: "bg-[#6EE7B7]/10 text-[#6EE7B7]",
  Posicionamiento: "bg-[#C4B5FD]/10 text-[#C4B5FD]",
  Positioning: "bg-[#C4B5FD]/10 text-[#C4B5FD]",
  Ecosistema: "bg-[#FCD34D]/10 text-[#FCD34D]",
  Ecosystem: "bg-[#FCD34D]/10 text-[#FCD34D]",
  General: "bg-[#94A3B8]/10 text-[#94A3B8]",
};

interface RealTimeAlertsMonitorProps {
  data?: {
    feeds: number;
    forums: number;
    news: number;
    reports: number;
    social: number;
    alerts_total?: number;
    alerts?: Array<{
      id: number;
      source: string;
      time: string;
      category: string;
      sentiment: "positive" | "negative";
      title: string;
      tags: string[];
      live?: boolean;
    }>;
  };
  compact?: boolean;
  embedded?: boolean;
}

function formatAlertTime(time: string): string {
  if (!time || time === "sin fecha" || time === "Sin fecha") return "Recent";
  return time;
}

type MonitorAlert = NonNullable<
  RealTimeAlertsMonitorProps["data"]
>["alerts"] extends (infer A)[] | undefined
  ? A
  : never;

function MonitorAlertCard({ alert }: { alert: MonitorAlert }) {
  return (
    <div className={DASHBOARD_INTELLIGENCE_CARD_SLOT_CLASS}>
      <div className="flex shrink-0 items-center gap-1.5 flex-wrap">
        {alert.live && (
          <div className="relative shrink-0">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF4C4C]" />
            <div className="absolute inset-0 h-1.5 w-1.5 animate-ping rounded-full bg-[#FF4C4C]" />
          </div>
        )}
        <span className="text-[8px] font-semibold uppercase tracking-wide text-[#E2E8F0]">
          {alert.source}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-px text-[8px] font-semibold",
            CATEGORY_COLORS[alert.category] ??
              "bg-[#C4B5FD]/10 text-[#C4B5FD]",
          )}
        >
          {alert.category}
        </span>
        <span
          className={cn(
            "rounded px-1.5 py-px text-[8px] font-semibold",
            alert.sentiment === "positive"
              ? "bg-[#6EE7B7]/10 text-[#6EE7B7]"
              : "bg-[#FCA5A5]/10 text-[#FCA5A5]",
          )}
        >
          {alert.sentiment === "positive" ? "▲ pos" : "▼ neg"}
        </span>
      </div>

      <h4 className={DASHBOARD_INTELLIGENCE_CARD_TITLE_CLASS}>{alert.title}</h4>

      <p className={cn(DASHBOARD_INTELLIGENCE_CARD_BODY_CLASS, "min-h-0 flex-1")}>
        {alert.tags.length > 0
          ? alert.tags.map((tag) => `#${tag}`).join(" · ")
          : "\u00A0"}
      </p>

      <div className={DASHBOARD_INTELLIGENCE_CARD_FOOTER_CLASS}>
        <span className="truncate text-[8px] text-[#64748B]/60">
          {formatAlertTime(alert.time)}
        </span>
      </div>
    </div>
  );
}

export default function RealTimeAlertsMonitor({
  data,
  compact = false,
  embedded = false,
}: RealTimeAlertsMonitorProps) {
  const [activeCategory, setActiveCategory] =
    useState<MonitorCategoryFilter>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [menuStyle, setMenuStyle] = useState({
    top: 0,
    left: 0,
    width: 160,
  });
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const updateMenuPosition = () => {
    const button = filterButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = Math.max(160, rect.width);
    setMenuStyle({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - width),
      width,
    });
  };

  useEffect(() => {
    if (!showMenu) return;

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        filterButtonRef.current?.contains(target) ||
        document.getElementById("realtime-monitor-filter-menu")?.contains(target)
      ) {
        return;
      }
      setShowMenu(false);
    };

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [showMenu]);

  const filterActive = activeCategory !== "all";
  const needsRemoteFetch = embedded && (currentPage > 0 || filterActive);

  const {
    data: monitorData,
    isLoading: monitorLoading,
    isError: monitorError,
    isFetching,
  } = useRealtimeMonitor(
    needsRemoteFetch
      ? {
          limit: ITEMS_PER_PAGE,
          offset: currentPage * ITEMS_PER_PAGE,
          category: activeCategory,
        }
      : undefined,
  );

  useEffect(() => {
    setCurrentPage(0);
  }, [activeCategory]);

  const fallbackAlerts = data?.alerts ?? [];
  const pageAlerts = embedded
    ? needsRemoteFetch
      ? (monitorData?.alerts ?? [])
      : fallbackAlerts
    : fallbackAlerts.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE,
      );

  const totalItems = embedded
    ? needsRemoteFetch
      ? (monitorData?.alerts_total ?? 0)
      : (data?.alerts_total ?? fallbackAlerts.length)
    : fallbackAlerts.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageStart = totalItems === 0 ? 0 : safePage * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min((safePage + 1) * ITEMS_PER_PAGE, totalItems);
  const paddedPageAlerts = padToPageSize(pageAlerts, ITEMS_PER_PAGE);
  const canGoPrev = safePage > 0;
  const canGoNext = safePage < totalPages - 1;
  const paginationActive = totalPages > 1;

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const isLoading = embedded && needsRemoteFetch && monitorLoading && !monitorData;
  const isError = embedded && needsRemoteFetch && monitorError;

  const selectedFilter =
    MONITOR_CATEGORY_FILTERS.find((f) => f.key === activeCategory) ??
    MONITOR_CATEGORY_FILTERS[0];

  const handleCategoryChange = (key: MonitorCategoryFilter) => {
    setActiveCategory(key);
    setCurrentPage(0);
    setShowMenu(false);
  };

  const activeFilterLabel =
    monitorData?.active_filter ??
    (filterActive ? selectedFilter.label : "All");

  const content = (
    <>
      <div
        className={cn(
          "relative z-10 shrink-0 flex flex-wrap items-center justify-between gap-4",
          embedded ? "mb-4" : compact ? "pt-2 mb-3" : cn("pt-3", DASHBOARD_METRIC_HEADER_CHART_GAP_CLASS),
        )}
      >
        <div>
          <h3 className="text-[15px] font-semibold tracking-[0.04em] text-[#E2E8F0]">
            Real-Time Intelligence Monitor
          </h3>
          <p className="mt-1 text-[13px] leading-[1.45] text-[#64748B]/60">
            Live signals · Monitored sources · Sentiment
          </p>
        </div>

        <div className="relative z-20">
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => {
              setShowMenu((prev) => {
                const next = !prev;
                if (next) updateMenuPosition();
                return next;
              });
            }}
            className={cn(
              "relative z-20 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
              filterActive
                ? selectedFilter.badge
                : "border-gray-600 bg-gray-900 text-gray-200 hover:border-gray-400",
            )}
            aria-label="Filter live alerts"
          >
            {filterActive ? (
              <>
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", selectedFilter.dot)}
                />
                {selectedFilter.label}
              </>
            ) : (
              "Filter by…"
            )}
            <span className="opacity-60">{showMenu ? "▲" : "▼"}</span>
          </button>

          {showMenu &&
            createPortal(
              <div
                id="realtime-monitor-filter-menu"
                style={{
                  top: menuStyle.top,
                  left: menuStyle.left,
                  width: menuStyle.width,
                }}
                className="fixed z-[9999] overflow-hidden rounded-lg border border-gray-600 bg-gray-900 shadow-2xl"
              >
                {MONITOR_CATEGORY_FILTERS.filter((f) => f.key !== "all").map(
                  ({ key, label, dot, text }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleCategoryChange(key)}
                      className={cn(
                        "flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors hover:bg-gray-800",
                        text,
                        activeCategory === key && "bg-gray-800",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                      <span className="flex-1">{label}</span>
                    </button>
                  ),
                )}
                {filterActive && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    className="w-full border-t border-gray-700 px-4 py-2.5 text-left text-xs text-gray-400 transition-colors hover:bg-gray-800"
                  >
                    Clear filter
                  </button>
                )}
              </div>,
              document.body,
            )}
        </div>
      </div>

      {!embedded && data && (
        <div className="relative z-10 mb-3 grid grid-cols-5 gap-2">
          {REALTIME_SOURCE_STATS.map(({ key, label, color }) => (
            <div
              key={key}
              className="rounded-lg border border-[#1E293B]/80 bg-white/[0.02] p-2 text-center"
            >
              <div className={cn("text-base font-bold font-mono", color)}>
                {data[key]}
              </div>
              <div className="mt-0.5 text-[9px] text-[#64748B]/60">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 shrink-0">
        <IntelligenceListFrame
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          paginationActive={paginationActive}
          isFetching={embedded && isFetching}
          prevLabel="Previous alerts"
          nextLabel="Next alerts"
          onPrev={() => setCurrentPage((p) => Math.max(0, p - 1))}
          onNext={() =>
            setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
          }
        >
          {paddedPageAlerts.map((alert, index) =>
            alert == null ? (
              <IntelligenceEmptySlot key={`empty-${index}`} />
            ) : (
              <MonitorAlertCard key={alert.id} alert={alert} />
            ),
          )}
        </IntelligenceListFrame>

        {isLoading ? (
          <IntelligenceListOverlay>
            <p className="text-[12px] text-[#64748B]/60 animate-pulse">
              Loading alerts...
            </p>
          </IntelligenceListOverlay>
        ) : null}

        {isError ? (
          <IntelligenceListOverlay>
            <p className="text-center text-[12px] text-[#FCA5A5]">
              Could not load live alerts.
            </p>
          </IntelligenceListOverlay>
        ) : null}

        {!isLoading && !isError && totalItems === 0 ? (
          <IntelligenceListOverlay>
            <p className="text-center text-[12px] text-[#64748B]/60">
              No alerts for this category.
            </p>
          </IntelligenceListOverlay>
        ) : null}
      </div>

      <div className={cn(DASHBOARD_METRIC_FOOTER_CLASS, "mt-3")}>
        <span className="text-[10px] text-[#64748B]/60">
          Filter: <span className="text-[#94A3B8]">{activeFilterLabel}</span>
          {" · "}
          Updated <span className="text-[#94A3B8]">just now</span>
        </span>
        <span className="text-[10px] text-[#64748B]/60">
          {totalPages > 1 ? (
            <>
              Page <span className="text-[#94A3B8]">{safePage + 1}</span> of{" "}
              <span className="text-[#94A3B8]">{totalPages}</span>
              {" · "}
              <span className="text-[#94A3B8]">
                {pageStart}–{pageEnd}
              </span>{" "}
              of <span className="text-[#94A3B8]">{totalItems}</span>
            </>
          ) : (
            <>
              <span className="text-[#94A3B8]">{totalItems}</span> alerts
            </>
          )}
        </span>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col lg:border-r lg:border-[#1E293B]/60 lg:pr-5">
        {content}
      </div>
    );
  }

  return (
    <div className={cn(DASHBOARD_METRIC_CARD_CLASS, "h-full")}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />
      {content}
    </div>
  );
}
