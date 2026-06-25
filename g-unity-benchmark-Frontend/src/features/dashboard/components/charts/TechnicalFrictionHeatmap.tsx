import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faInfoCircle,
  faChevronLeft,
  faChevronRight,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useServiceDraftStore } from "../../../../store/useServiceDraftStore";
import {
  useTechnicalFrictionStore,
  type TechnicalFrictionDraftRecord,
} from "../../../../store/useTechnicalFrictionStore";
import { SERVICE_DRAFT_CTA } from "../serviceDraftCta";
import { cn } from "../../../../utils/cn";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
  DASHBOARD_METRIC_FOOTER_CLASS,
  DASHBOARD_METRIC_LIST_ITEM_CLASS,
  DASHBOARD_METRIC_NAV_ARROW_CLASS,
  DASHBOARD_METRIC_STATS_GRID_CLASS,
  DASHBOARD_METRIC_VIEW_SLOT_CLASS,
  DashboardMetricCardHeader,
  DashboardMetricStatTile,
  type DashboardViewMode,
} from "./DashboardViewToggle";
import type { TechnicalFrictionIssueDTO } from "../../services/technicalFriction";

const ISSUES_PER_PAGE = 5;

const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-[#FF4C4C]/10",
    text: "text-[#FF4C4C]",
    border: "border-[#FF4C4C]/30",
  },
  high: {
    bg: "bg-[#FF9800]/10",
    text: "text-[#FF9800]",
    border: "border-[#FF9800]/30",
  },
  medium: {
    bg: "bg-[#FFC107]/10",
    text: "text-[#FFC107]",
    border: "border-[#FFC107]/30",
  },
  low: {
    bg: "bg-[#3DDC84]/10",
    text: "text-[#3DDC84]",
    border: "border-[#3DDC84]/30",
  },
};

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function normalizeSeverity(value: string | undefined): string {
  return (value ?? "low").toLowerCase().trim();
}

function shouldShowServiceDraft(severity: string | undefined): boolean {
  const sev = normalizeSeverity(severity);
  return sev === "critical" || sev === "high";
}

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compareIssues(
  a: TechnicalFrictionIssueDTO,
  b: TechnicalFrictionIssueDTO,
): number {
  const sevDiff =
    (SEVERITY_ORDER[normalizeSeverity(b.severity)] ?? 0) -
    (SEVERITY_ORDER[normalizeSeverity(a.severity)] ?? 0);
  if (sevDiff !== 0) return sevDiff;
  return (b.impactScore ?? 0) - (a.impactScore ?? 0);
}

type FrictionCategory = {
  name: string;
  severity?: string;
  activeIssues?: number;
  issues?: TechnicalFrictionIssueDTO[];
};

type FrictionIssueCardProps = {
  issue: TechnicalFrictionIssueDTO;
  showDraftButton: boolean;
  isDraftLoading: boolean;
  onCreateDraft: (issue: TechnicalFrictionIssueDTO) => void;
};

function FrictionIssueCard({
  issue,
  showDraftButton,
  isDraftLoading,
  onCreateDraft,
}: FrictionIssueCardProps) {
  const sevKey = normalizeSeverity(issue.severity) as keyof typeof SEVERITY_CONFIG;
  const sev = SEVERITY_CONFIG[sevKey] ?? SEVERITY_CONFIG.low;
  const showDraft =
    showDraftButton && shouldShowServiceDraft(issue.severity);

  return (
    <div className={DASHBOARD_METRIC_LIST_ITEM_CLASS}>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[8px] font-semibold px-1.5 py-px rounded uppercase border",
            sev.bg,
            sev.text,
            sev.border,
          )}
        >
          {normalizeSeverity(issue.severity)}
        </span>
        <span className="text-[8px] text-[#64748B]/60 bg-[#1E293B]/60 px-1.5 py-px rounded font-mono">
          {issue.errorCode}
        </span>
        {issue.impactScore != null && (
          <span className="ml-auto shrink-0 text-[8px] font-mono text-[#64748B]/60">
            Impact:{" "}
            <span className={`font-bold ${sev.text}`}>{issue.impactScore}</span>
          </span>
        )}
      </div>

      <h4 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[#E2E8F0]">
        {issue.title}
      </h4>

      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#64748B]/60">
        {issue.description}
      </p>

      <div className="mt-2.5 flex items-center gap-2 border-t border-[#1E293B]/60 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-[8px] text-[#64748B]/60">
          {issue.firstSeen && <span className="truncate">{issue.firstSeen}</span>}
          {issue.devices != null && issue.devices > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span className="shrink-0 font-mono">
                {issue.devices.toLocaleString()} dev.
              </span>
            </>
          )}
        </div>
        {showDraft && (
          <div className="ml-auto flex shrink-0 items-center">
            <button
              type="button"
              disabled={!issue.id || isDraftLoading}
              onClick={() => onCreateDraft(issue)}
              className={SERVICE_DRAFT_CTA.className}
            >
              <FontAwesomeIcon
                icon={SERVICE_DRAFT_CTA.icon}
                className={SERVICE_DRAFT_CTA.iconClassName}
              />
              <span className={SERVICE_DRAFT_CTA.labelClassName}>
                {SERVICE_DRAFT_CTA.label}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type FrictionHistoryCardProps = {
  record: TechnicalFrictionDraftRecord;
  onRestore: (id: number) => void;
};

function FrictionHistoryCard({ record, onRestore }: FrictionHistoryCardProps) {
  const sevKey = normalizeSeverity(record.severity) as keyof typeof SEVERITY_CONFIG;
  const sev = SEVERITY_CONFIG[sevKey] ?? SEVERITY_CONFIG.low;

  return (
    <div
      className={cn(
        DASHBOARD_METRIC_LIST_ITEM_CLASS,
        "border-[#1E293B]/60 bg-white/[0.015] opacity-90",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-[8px] font-semibold px-1.5 py-px rounded uppercase border",
            sev.bg,
            sev.text,
            sev.border,
          )}
        >
          {normalizeSeverity(record.severity)}
        </span>
        <span className="text-[8px] text-[#64748B]/60 bg-[#1E293B]/60 px-1.5 py-px rounded font-mono">
          {record.errorCode}
        </span>
        <span className="ml-auto shrink-0 text-[8px] font-medium text-[#3DDC84]/80">
          {formatGeneratedAt(record.generatedAt)}
        </span>
      </div>
      <h4 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[#CBD5E1]">
        {record.title}
      </h4>
      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#64748B]/50">
        {record.description}
      </p>
      <div className="mt-2.5 flex items-center gap-2 border-t border-[#1E293B]/50 pt-2.5">
        {record.impactScore != null && (
          <span className="text-[8px] font-mono text-[#64748B]/60">
            Impact:{" "}
            <span className={`font-bold ${sev.text}`}>{record.impactScore}</span>
          </span>
        )}
        <div className="ml-auto flex justify-end">
        <button
          type="button"
          onClick={() => onRestore(record.analyzedPostId)}
          title="Volver a pendientes"
          className="inline-flex items-center gap-1 rounded-sm border border-[#1E293B]/80 bg-white/[0.02] px-2 py-1 text-[10px] font-medium text-[#94A3B8] transition hover:border-[#334155]/60 hover:text-[#E2E8F0]"
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
          Restaurar
        </button>
        </div>
      </div>
    </div>
  );
}

const STAT_TILE_FALLBACK = [
  { name: "UI", severity: "low" as const },
  { name: "API", severity: "low" as const },
  { name: "Documentation", severity: "low" as const },
  { name: "Crash", severity: "low" as const },
];

export default function TechnicalFrictionHeatmap({
  data,
  isLoading = false,
  isError = false,
  errorMessage = null,
  isRealData = false,
}: {
  data?: { categories?: FrictionCategory[] };
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
  isRealData?: boolean;
}) {
  const categories = data?.categories ?? [];

  const topBugCategories = useMemo(
    () =>
      [...categories]
        .sort(
          (a, b) =>
            (b.activeIssues ?? b.issues?.length ?? 0) -
            (a.activeIssues ?? a.issues?.length ?? 0),
        )
        .slice(0, 4),
    [categories],
  );

  const [view, setView] = useState<DashboardViewMode>("current");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const draftHistory = useTechnicalFrictionStore((s) => s.draftHistory);
  const restoreToPending = useTechnicalFrictionStore((s) => s.restoreToPending);
  const resetDraftHistory = useTechnicalFrictionStore((s) => s.resetDraftHistory);

  const openDraft = useServiceDraftStore((s) => s.openDraft);
  const isDraftLoading = useServiceDraftStore((s) => s.isLoading);

  useEffect(() => {
    if (topBugCategories.length === 0) {
      setSelectedCategory(null);
      return;
    }
    const names = topBugCategories.map((c) => c.name);
    if (!selectedCategory || !names.includes(selectedCategory)) {
      setSelectedCategory(topBugCategories[0].name);
    }
  }, [topBugCategories, selectedCategory]);

  const selectedCategoryData = useMemo(
    () => categories.find((c) => c.name === selectedCategory),
    [categories, selectedCategory],
  );

  const categoryIssues = useMemo(
    () => [...(selectedCategoryData?.issues ?? [])].sort(compareIssues),
    [selectedCategoryData],
  );

  const draftIdSet = useMemo(
    () => new Set(draftHistory.map((r) => r.analyzedPostId)),
    [draftHistory],
  );

  const pendingIssues = useMemo(
    () => categoryIssues.filter((issue) => !draftIdSet.has(issue.id)),
    [categoryIssues, draftIdSet],
  );

  const historyRows = useMemo(
    () =>
      draftHistory
        .filter((row) => row.category === selectedCategory)
        .sort((a, b) => Date.parse(b.generatedAt) - Date.parse(a.generatedAt)),
    [draftHistory, selectedCategory],
  );

  const listLength = view === "current" ? pendingIssues.length : historyRows.length;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listLength / ISSUES_PER_PAGE)),
    [listLength],
  );

  const safePage = Math.min(currentPage, totalPages - 1);

  const pageIssues = useMemo(
    () =>
      pendingIssues.slice(
        safePage * ISSUES_PER_PAGE,
        safePage * ISSUES_PER_PAGE + ISSUES_PER_PAGE,
      ),
    [pendingIssues, safePage],
  );

  const pageHistory = useMemo(
    () =>
      historyRows.slice(
        safePage * ISSUES_PER_PAGE,
        safePage * ISSUES_PER_PAGE + ISSUES_PER_PAGE,
      ),
    [historyRows, safePage],
  );

  const pageStart = listLength === 0 ? 0 : safePage * ISSUES_PER_PAGE + 1;
  const pageEnd = Math.min((safePage + 1) * ISSUES_PER_PAGE, listLength);
  const canGoPrev = safePage > 0;
  const canGoNext = safePage < totalPages - 1;

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory, view, categoryIssues.length, draftHistory.length]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const handleCreateServiceDraft = (issue: TechnicalFrictionIssueDTO) => {
    if (!isRealData || !issue.id || isDraftLoading) return;
    void openDraft(issue.id, "technical_friction");
  };

  const showDraftButton = isRealData && !isLoading && !isError;

  const handleCategorySelect = (name: string) => {
    setSelectedCategory(name);
  };

  const statTiles = useMemo(() => {
    if (topBugCategories.length >= 4) return topBugCategories;
    if (topBugCategories.length > 0) {
      const filled = [...topBugCategories];
      for (const slot of STAT_TILE_FALLBACK) {
        if (filled.length >= 4) break;
        if (!filled.some((c) => c.name === slot.name)) {
          filled.push({
            name: slot.name,
            severity: slot.severity,
            activeIssues: 0,
            issues: [],
          });
        }
      }
      return filled.slice(0, 4);
    }
    return STAT_TILE_FALLBACK.map((slot) => ({
      name: slot.name,
      severity: slot.severity,
      activeIssues: 0,
      issues: [],
    }));
  }, [topBugCategories]);

  return (
    <div className={DASHBOARD_METRIC_CARD_CLASS}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />

      <DashboardMetricCardHeader
        title="Technical Friction Heatmap"
        subtitle={
          view === "current"
            ? "Anomalías por categoría · Casos pendientes de Service Draft"
            : "Issues con Service Draft generado · Historial de resolución"
        }
        view={view}
        onViewChange={setView}
      />

      <div className={DASHBOARD_METRIC_STATS_GRID_CLASS}>
        {statTiles.map((cat) => {
          const sevKey = normalizeSeverity(
            cat.severity,
          ) as keyof typeof SEVERITY_CONFIG;
          const sev = SEVERITY_CONFIG[sevKey] ?? SEVERITY_CONFIG.low;
          const issueCount = cat.activeIssues ?? cat.issues?.length ?? 0;
          const hasData = topBugCategories.some((c) => c.name === cat.name);
          const isSelected = selectedCategory === cat.name;
          return (
            <DashboardMetricStatTile
              key={cat.name}
              value={isLoading ? "—" : issueCount}
              label={cat.name}
              valueClassName={isLoading ? "text-[#64748B]/50" : sev.text}
              selected={isSelected && hasData}
              onClick={
                !isLoading && !isError && hasData
                  ? () => handleCategorySelect(cat.name)
                  : undefined
              }
              title={cat.name}
            />
          );
        })}
      </div>

      <div
        className={cn(
          "relative z-10 flex-1 min-h-0",
          DASHBOARD_METRIC_VIEW_SLOT_CLASS,
        )}
      >
        {isLoading ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#1E293B]/80 bg-white/[0.02] px-4 py-6 text-center">
            <p className="text-[12px] font-semibold text-[#E2E8F0] animate-pulse">
              Cargando fricción técnica desde analyzed_posts…
            </p>
          </div>
        ) : isError ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-[#FF4C4C]/30 bg-[#FF4C4C]/5 px-4 py-6 text-center">
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              className="text-[20px] text-[#FF4C4C]"
            />
            <p className="text-[12px] font-semibold text-[#FCA5A5]">
              No se pudo cargar Technical Friction
            </p>
            <p className="text-[10px] text-[#64748B]/80 max-w-[280px]">
              {errorMessage || "Error de conexión con la API."}
            </p>
          </div>
        ) : !selectedCategory ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#1E293B]/80 bg-white/[0.02] px-4 py-6 text-center">
            <FontAwesomeIcon icon={faInfoCircle} className="text-[22px] text-[#64748B]" />
            <p className="text-[12px] font-semibold text-[#E2E8F0]">
              Sin categorías técnicas en la base de datos
            </p>
          </div>
        ) : listLength === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#1E293B]/80 bg-white/[0.02] px-4 py-6 text-center">
            <FontAwesomeIcon icon={faInfoCircle} className="text-[22px] text-[#64748B]" />
            <p className="text-[12px] font-semibold text-[#E2E8F0]">
              {view === "history"
                ? "Historial vacío en esta categoría"
                : "Sin errores pendientes en esta categoría"}
            </p>
            <p className="text-[10px] text-[#64748B]/70">
              {view === "history"
                ? "Genera un Service Draft desde Actual para verlo aquí."
                : "Todos los casos tienen draft o prueba otra categoría."}
            </p>
            {view === "current" && historyRows.length > 0 && (
              <button
                type="button"
                onClick={() => setView("history")}
                className="mt-1 text-[10px] font-medium text-[#94A3B8] underline-offset-2 hover:text-[#E2E8F0] hover:underline"
              >
                Ver historial ({historyRows.length})
              </button>
            )}
          </div>
        ) : (
          <div className="flex min-h-[200px] items-stretch gap-1.5">
              {totalPages > 1 && (
                <button
                  type="button"
                  aria-label={
                    view === "current" ? "Errores anteriores" : "Historial anterior"
                  }
                  disabled={!canGoPrev}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className={DASHBOARD_METRIC_NAV_ARROW_CLASS}
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-[11px]" />
                </button>
              )}

              <div className="min-w-0 flex-1 space-y-2">
                {view === "current"
                  ? pageIssues.map((issue) => (
                      <FrictionIssueCard
                        key={issue.id}
                        issue={issue}
                        showDraftButton={showDraftButton}
                        isDraftLoading={isDraftLoading}
                        onCreateDraft={handleCreateServiceDraft}
                      />
                    ))
                  : pageHistory.map((row) => (
                      <FrictionHistoryCard
                        key={row.analyzedPostId}
                        record={row}
                        onRestore={restoreToPending}
                      />
                    ))}
              </div>

              {totalPages > 1 && (
                <button
                  type="button"
                  aria-label={
                    view === "current" ? "Siguientes errores" : "Siguiente historial"
                  }
                  disabled={!canGoNext}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  className={DASHBOARD_METRIC_NAV_ARROW_CLASS}
                >
                  <FontAwesomeIcon icon={faChevronRight} className="text-[11px]" />
                </button>
              )}
          </div>
        )}
      </div>

      <div className={DASHBOARD_METRIC_FOOTER_CLASS}>
        {!isLoading && !isError && selectedCategory ? (
          <>
            <span className="text-[10px] text-[#64748B]/60">
            {totalPages > 1 ? (
              <>
                Grupo <span className="text-[#94A3B8]">{safePage + 1}</span> de{" "}
                <span className="text-[#94A3B8]">{totalPages}</span>
                {" · "}
                <span className="text-[#94A3B8]">
                  {pageStart}–{pageEnd}
                </span>{" "}
                de <span className="text-[#94A3B8]">{listLength}</span>
              </>
            ) : (
              <>
                <span className="text-[#94A3B8]">{listLength}</span>{" "}
                {view === "current" ? "pendientes" : "en historial"}
              </>
            )}
          </span>
          <div className="flex items-center gap-3">
            {view === "history" && historyRows.length > 0 && (
              <button
                type="button"
                onClick={resetDraftHistory}
                className="inline-flex items-center gap-1 text-[10px] text-[#64748B]/70 transition hover:text-[#E2E8F0]"
                title="Vaciar historial y restaurar todos a pendientes"
              >
                <FontAwesomeIcon icon={faRotateLeft} className="text-[8px]" />
                Restablecer todo
              </button>
            )}
            <span className="text-[10px] text-[#64748B]/60">
              {view === "current" ? (
                <>
                  <span className="text-[#94A3B8]">{historyRows.length}</span> en
                  historial
                </>
              ) : (
                <>
                  <span className="text-[#94A3B8]">{pendingIssues.length}</span>{" "}
                  pendientes
                </>
              )}
            </span>
          </div>
          </>
        ) : (
          <span className="text-[10px] text-[#64748B]/60">
            Selecciona una categoría para explorar errores
          </span>
        )}
      </div>
    </div>
  );
}
