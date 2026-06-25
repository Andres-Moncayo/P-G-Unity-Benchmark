import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../../../utils/cn";
import {
  DASHBOARD_METRIC_LIST_ITEM_CLASS,
  DASHBOARD_METRIC_NAV_ARROW_CLASS,
} from "./DashboardViewToggle";

/** Items per page — aligned with Analytics Insights pagination density. */
export const DASHBOARD_INTELLIGENCE_ITEMS_PER_PAGE = 8;

/** Measured InsightCard height in dashboard (Analytics Insights). */
export const DASHBOARD_INTELLIGENCE_CARD_HEIGHT_CLASS = "h-[138px] min-h-[138px] max-h-[138px]";

/** List block: 8 × 138px cards + 7 × gap-2 (0.5rem). */
export const DASHBOARD_INTELLIGENCE_LIST_AREA_CLASS =
  "relative h-[calc(8*138px+7*0.5rem)] min-h-[calc(8*138px+7*0.5rem)] max-h-[calc(8*138px+7*0.5rem)] shrink-0";

/** Same rhythm as InsightCard (AnalyticsInsights). */
export const DASHBOARD_INTELLIGENCE_CARD_TITLE_CLASS =
  "mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[#E2E8F0]";

export const DASHBOARD_INTELLIGENCE_CARD_BODY_CLASS =
  "mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#64748B]/60";

export const DASHBOARD_INTELLIGENCE_CARD_FOOTER_CLASS =
  "mt-2.5 flex shrink-0 items-center gap-2 border-t border-[#1E293B]/60 pt-2.5";

/** Fixed card shell (InsightCard list item + stable slot height). */
export const DASHBOARD_INTELLIGENCE_CARD_SLOT_CLASS = cn(
  DASHBOARD_METRIC_LIST_ITEM_CLASS,
  DASHBOARD_INTELLIGENCE_CARD_HEIGHT_CLASS,
  "flex flex-col overflow-hidden",
);

export const DASHBOARD_INTELLIGENCE_EMPTY_SLOT_CLASS = cn(
  DASHBOARD_INTELLIGENCE_CARD_HEIGHT_CLASS,
  "shrink-0 rounded-lg",
  "border border-dashed border-[#1E293B]/40 bg-white/[0.01]",
);

export const DASHBOARD_INTELLIGENCE_LIST_GRID_CLASS =
  "grid min-h-0 flex-1 grid-rows-8 gap-2";

export function padToPageSize<T>(
  items: T[],
  size: number = DASHBOARD_INTELLIGENCE_ITEMS_PER_PAGE,
): (T | null)[] {
  return Array.from({ length: size }, (_, index) => items[index] ?? null);
}

export function IntelligenceEmptySlot() {
  return <div className={DASHBOARD_INTELLIGENCE_EMPTY_SLOT_CLASS} aria-hidden />;
}

export function IntelligenceListOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-gray-900/55 px-4">
      {children}
    </div>
  );
}

type IntelligenceListFrameProps = {
  children: ReactNode;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  paginationActive?: boolean;
  isFetching?: boolean;
};

export function IntelligenceListFrame({
  children,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  paginationActive = false,
  isFetching = false,
}: IntelligenceListFrameProps) {
  const navHidden = !paginationActive;

  return (
    <div
      className={cn(
        DASHBOARD_INTELLIGENCE_LIST_AREA_CLASS,
        isFetching && "opacity-70 transition-opacity",
      )}
    >
      <div className="flex h-full items-stretch gap-1.5">
        <button
          type="button"
          aria-label={prevLabel}
          disabled={navHidden || !canGoPrev}
          onClick={onPrev}
          className={cn(
            DASHBOARD_METRIC_NAV_ARROW_CLASS,
            navHidden && "invisible pointer-events-none",
          )}
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-[11px]" />
        </button>

        <div className={DASHBOARD_INTELLIGENCE_LIST_GRID_CLASS}>{children}</div>

        <button
          type="button"
          aria-label={nextLabel}
          disabled={navHidden || !canGoNext}
          onClick={onNext}
          className={cn(
            DASHBOARD_METRIC_NAV_ARROW_CLASS,
            navHidden && "invisible pointer-events-none",
          )}
        >
          <FontAwesomeIcon icon={faChevronRight} className="text-[11px]" />
        </button>
      </div>
    </div>
  );
}
