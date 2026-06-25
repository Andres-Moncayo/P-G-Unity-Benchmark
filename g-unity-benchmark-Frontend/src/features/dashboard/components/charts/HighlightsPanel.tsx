import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../../utils/cn";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
  DASHBOARD_METRIC_FOOTER_CLASS,
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
import { useDashboardHighlights } from "../../hooks/useDashboardHighlights";
import type {
  DashboardHighlightDTO,
  DashboardPostHighlightDTO,
  HighlightCategoryFilter,
} from "../../services/highlightsService";

const ITEMS_PER_PAGE = DASHBOARD_INTELLIGENCE_ITEMS_PER_PAGE;

const CATEGORY_FILTERS: {
  key: HighlightCategoryFilter;
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
    key: "ai",
    label: "AI",
    dot: "bg-[#7DD3FC]",
    text: "text-[#7DD3FC]",
    badge: "text-[#7DD3FC] bg-sky-950 border-sky-700",
  },
  {
    key: "robotic",
    label: "Robotic",
    dot: "bg-[#C4B5FD]",
    text: "text-[#C4B5FD]",
    badge: "text-[#C4B5FD] bg-violet-950 border-violet-700",
  },
  {
    key: "digital_twins",
    label: "Digital twins",
    dot: "bg-[#6EE7B7]",
    text: "text-[#6EE7B7]",
    badge: "text-[#6EE7B7] bg-emerald-950 border-emerald-700",
  },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  AI: "bg-[#7DD3FC]/10 text-[#7DD3FC]",
  Robotic: "bg-[#C4B5FD]/10 text-[#C4B5FD]",
  "Digital twins": "bg-[#6EE7B7]/10 text-[#6EE7B7]",
};

type HighlightListItem =
  | { kind: "insight"; item: DashboardHighlightDTO }
  | { kind: "post"; item: DashboardPostHighlightDTO };

interface HighlightsPanelProps {
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  embedded?: boolean;
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={cn(
        "text-[8px] px-1.5 py-px rounded font-semibold shrink-0",
        CATEGORY_BADGE_COLORS[category] ?? "bg-[#94A3B8]/10 text-[#94A3B8]",
      )}
    >
      {category}
    </span>
  );
}

function StrategicHighlightItem({ item }: { item: DashboardHighlightDTO }) {
  return (
    <div className={DASHBOARD_INTELLIGENCE_CARD_SLOT_CLASS}>
      <div className="flex shrink-0 items-center gap-1.5 flex-wrap">
        <span className="text-[8px] font-semibold uppercase tracking-wide text-[#64748B]/80">
          Insight
        </span>
        <CategoryBadge category={item.category} />
      </div>
      <h4 className={DASHBOARD_INTELLIGENCE_CARD_TITLE_CLASS}>{item.title}</h4>
      <p className={cn(DASHBOARD_INTELLIGENCE_CARD_BODY_CLASS, "min-h-0 flex-1")}>
        {item.content}
      </p>
      <div className={DASHBOARD_INTELLIGENCE_CARD_FOOTER_CLASS}>
        <span className="truncate text-[8px] text-[#64748B]/60">
          {item.game_engine}
        </span>
      </div>
    </div>
  );
}

function PostHighlightItem({ item }: { item: DashboardPostHighlightDTO }) {
  return (
    <div className={DASHBOARD_INTELLIGENCE_CARD_SLOT_CLASS}>
      <div className="flex shrink-0 items-center gap-1.5 flex-wrap">
        <span className="text-[8px] font-semibold uppercase tracking-wide text-[#64748B]/80">
          Post
        </span>
        <CategoryBadge category={item.category} />
      </div>
      <h4 className={DASHBOARD_INTELLIGENCE_CARD_TITLE_CLASS}>
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#7DD3FC] transition-colors"
          >
            {item.title}
          </a>
        ) : (
          item.title
        )}
      </h4>
      <p className={cn(DASHBOARD_INTELLIGENCE_CARD_BODY_CLASS, "min-h-0 flex-1")}>
        {item.summary}
      </p>
      <div className={DASHBOARD_INTELLIGENCE_CARD_FOOTER_CLASS}>
        <span className="truncate text-[8px] text-[#64748B]/60">
          {item.date ?? item.game_engine}
        </span>
      </div>
    </div>
  );
}

export default function HighlightsPanel({
  isLoading: externalLoading,
  isError: externalError,
  errorMessage,
  embedded = false,
}: HighlightsPanelProps) {
  const [activeCategory, setActiveCategory] =
    useState<HighlightCategoryFilter>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({
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
        document.getElementById("highlights-filter-menu")?.contains(target)
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

  const {
    data,
    isLoading: queryLoading,
    isError: queryError,
    isFetching,
  } = useDashboardHighlights({ category: activeCategory });

  const isLoading = externalLoading ?? queryLoading;
  const isError = externalError ?? queryError;

  const allItems = useMemo<HighlightListItem[]>(() => {
    if (!data) return [];
    return [
      ...data.highlights.map(
        (item): HighlightListItem => ({ kind: "insight", item }),
      ),
      ...data.post_highlights.map(
        (item): HighlightListItem => ({ kind: "post", item }),
      ),
    ];
  }, [data]);

  const totalItems = allItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const pageStart = totalItems === 0 ? 0 : safePage * ITEMS_PER_PAGE + 1;
  const pageEnd = Math.min((safePage + 1) * ITEMS_PER_PAGE, totalItems);
  const pageItems = allItems.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE,
  );
  const paddedPageSlots = padToPageSize(pageItems, ITEMS_PER_PAGE);
  const canGoPrev = safePage > 0;
  const canGoNext = safePage < totalPages - 1;
  const paginationActive = totalPages > 1;

  useEffect(() => {
    setCurrentPage(0);
  }, [activeCategory]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const categoryCounts = data?.category_counts ?? {};

  const selectedFilter =
    CATEGORY_FILTERS.find((f) => f.key === activeCategory) ??
    CATEGORY_FILTERS[0];

  const getCategoryCount = (key: HighlightCategoryFilter, label: string) =>
    key === "all"
      ? Object.values(categoryCounts).reduce((a, b) => a + b, 0)
      : (categoryCounts[label] ?? 0);

  const handleCategoryChange = (key: HighlightCategoryFilter) => {
    setActiveCategory(key);
    setCurrentPage(0);
    setShowMenu(false);
  };

  const content = (
    <>
      <div className="relative z-10 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[0.04em] text-[#E2E8F0]">
            Highlights
          </h3>
          <p className="mt-1 text-[13px] leading-[1.45] text-[#64748B]/60">
            Strategic insights · Featured posts
          </p>
        </div>

        <div className="relative z-20">
          <button
            ref={filterButtonRef}
            type="button"
            aria-label="Filter highlights"
            aria-expanded={showMenu}
            aria-haspopup="listbox"
            onClick={() => {
              setShowMenu((prev) => {
                const next = !prev;
                if (next) updateMenuPosition();
                return next;
              });
            }}
            className={cn(
              "relative z-20 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
              activeCategory !== "all"
                ? selectedFilter.badge
                : "border-gray-600 bg-gray-900 text-gray-200 hover:border-gray-400",
            )}
          >
            {activeCategory !== "all" ? (
              <>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    selectedFilter.dot,
                  )}
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
                id="highlights-filter-menu"
                style={{
                  top: menuStyle.top,
                  left: menuStyle.left,
                  width: menuStyle.width,
                }}
                className="fixed z-[9999] overflow-hidden rounded-lg border border-gray-600 bg-gray-900 shadow-2xl"
              >
                {CATEGORY_FILTERS.filter((f) => f.key !== "all").map(
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
                      <span className="font-mono tabular-nums text-[10px] opacity-60">
                        {getCategoryCount(key, label)}
                      </span>
                    </button>
                  ),
                )}
                {activeCategory !== "all" && (
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

      <div className="relative z-10 shrink-0">
        <IntelligenceListFrame
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          paginationActive={paginationActive}
          isFetching={isFetching}
          prevLabel="Previous highlights"
          nextLabel="Next highlights"
          onPrev={() => setCurrentPage((p) => Math.max(0, p - 1))}
          onNext={() =>
            setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
          }
        >
          {paddedPageSlots.map((entry, index) =>
            entry == null ? (
              <IntelligenceEmptySlot key={`empty-${index}`} />
            ) : entry.kind === "insight" ? (
              <StrategicHighlightItem
                key={`h-${entry.item.id}`}
                item={entry.item}
              />
            ) : (
              <PostHighlightItem
                key={`p-${entry.item.id}`}
                item={entry.item}
              />
            ),
          )}
        </IntelligenceListFrame>

        {isLoading && !data ? (
          <IntelligenceListOverlay>
            <p className="text-[12px] text-[#64748B]/60 animate-pulse">
              Loading highlights...
            </p>
          </IntelligenceListOverlay>
        ) : null}

        {isError ? (
          <IntelligenceListOverlay>
            <p className="text-center text-[12px] text-[#FCA5A5]">
              {errorMessage ?? "Could not load highlights."}
            </p>
          </IntelligenceListOverlay>
        ) : null}

        {!isLoading && !isError && totalItems === 0 ? (
          <IntelligenceListOverlay>
            <p className="text-center text-[12px] text-[#64748B]/60">
              No highlights for this category.
            </p>
          </IntelligenceListOverlay>
        ) : null}
      </div>

      <div className={cn(DASHBOARD_METRIC_FOOTER_CLASS, embedded && "mt-3")}>
        <span className="text-[10px] text-[#64748B]/60">
          Filter:{" "}
          <span className="text-[#94A3B8]">
            {data?.active_filter ?? "All"}
          </span>
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
              <span className="text-[#94A3B8]">{totalItems}</span> items
            </>
          )}
        </span>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className="flex h-full min-h-0 flex-col lg:pl-1">{content}</div>
    );
  }

  return (
    <div
      className={cn(
        DASHBOARD_METRIC_CARD_CLASS,
        "h-full !bg-gray-900 border border-gray-800",
      )}
    >
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />
      <div className="relative z-10 pt-3">{content}</div>
    </div>
  );
}
