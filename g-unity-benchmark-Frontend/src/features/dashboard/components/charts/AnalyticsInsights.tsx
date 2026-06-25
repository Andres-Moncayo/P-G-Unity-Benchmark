import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faExclamationTriangle,
  faInfoCircle,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
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
import { useNavigationStore } from "../../../../store/useNavigationStore";
import { useInsightsStore } from "../../../../store/useInsightsStore";
import type { AnalyticsInsightDTO } from "../../services/analyticsInsights";

type AnalyticsInsight = AnalyticsInsightDTO;

const INSIGHTS_PER_PAGE = 5;

interface AnalyticsInsightsProps {
  data: {
    analyticsInsights: AnalyticsInsight[];
  };
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string | null;
}

const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-[#FF4C4C]/10",
    text: "text-[#FF4C4C]",
    border: "border-[#FF4C4C]/30",
  },
  high: {
    bg: "bg-[#FF6B6B]/10",
    text: "text-[#FF6B6B]",
    border: "border-[#FF6B6B]/30",
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

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 } as const;

const SEVERITY_STATS = [
  { key: "critical" as const, label: "Critical", color: "text-[#FF4C4C]" },
  { key: "high" as const, label: "High", color: "text-[#FF6B6B]" },
  { key: "medium" as const, label: "Medium", color: "text-[#FFC107]" },
  { key: "low" as const, label: "Low", color: "text-[#3DDC84]" },
] as const;

type SeverityFilterKey = (typeof SEVERITY_STATS)[number]["key"];

const SEVERITY_FILTER_ORDER: SeverityFilterKey[] = [
  "critical",
  "high",
  "medium",
  "low",
];

const CTA_PROPS = {
  label: "Analizar ahora",
  icon: faChartLine,
  iconClassName: "shrink-0 !text-[13px] leading-none text-[#FCA5A5]",
  className: cn(
    "inline-flex h-[26px] min-h-0 max-h-[26px] cursor-pointer items-center gap-1 rounded-sm px-2 py-0.5",
    "!text-[13px] font-medium leading-none transition-all duration-300",
    "bg-[#FCA5A5]/10 shadow-sm shadow-[#FCA5A5]/15 text-[#FCA5A5] hover:bg-[#FCA5A5]/15 hover:shadow-md hover:shadow-[#FCA5A5]/25",
  ),
  labelClassName: "text-[13px] leading-none",
} as const;

function parseLastUpdatedMs(value: string): number {
  const normalized = value.trim().replace(" ", "T");
  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? 0 : ms;
}

function compareInsightsByPriority(
  a: AnalyticsInsight,
  b: AnalyticsInsight,
): number {
  const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
  if (severityDiff !== 0) return severityDiff;

  if (b.impact !== a.impact) return b.impact - a.impact;

  if (b.confidence !== a.confidence) return b.confidence - a.confidence;

  return parseLastUpdatedMs(b.lastUpdated) - parseLastUpdatedMs(a.lastUpdated);
}

const buildInsightPrompt = (insight: AnalyticsInsight): string => {
  const severityLabel = insight.severity.toUpperCase();
  return [
    `Executive analysis requested · Analytics Insights`,
    ``,
    `Insight #${insight.id} — ${insight.title}`,
    `Severidad: ${severityLabel} · Categoría: ${insight.category} · Impacto: ${insight.impact}/100`,
    `Tendencia: ${insight.trend} · Confianza del modelo: ${insight.confidence}%`,
    `Última actualización: ${insight.lastUpdated}`,
    ``,
    `Contexto:`,
    insight.description,
    ``,
    `As Nexus AI, please:`,
    `1. Valida la magnitud real de esta situación ${severityLabel} y su impacto estratégico en Unity.`,
    `2. Propose a prioritized action plan (short/mid-term) with tracking metrics.`,
    `3. Identify collateral risks, dependencies, and adjacent opportunities.`,
  ].join("\n");
};

type InsightCardProps = {
  insight: AnalyticsInsight;
  onAnalyze: (insight: AnalyticsInsight) => void;
};

type HistoryInsightCardProps = {
  insight: AnalyticsInsight;
  analyzedAt: string;
  onRestore: (id: number) => void;
};

function formatAnalyzedAt(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistoryInsightCard({
  insight,
  analyzedAt,
  onRestore,
}: HistoryInsightCardProps) {
  const cfg = SEVERITY_CONFIG[insight.severity];

  return (
    <div
      className={cn(
        DASHBOARD_METRIC_LIST_ITEM_CLASS,
        "border-[#1E293B]/60 bg-white/[0.015] opacity-90",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`text-[8px] px-1.5 py-px rounded font-semibold uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
          {insight.severity}
        </span>
        <span className="ml-auto text-[8px] text-[#3DDC84]/80 font-medium shrink-0">
          Analizado · {formatAnalyzedAt(analyzedAt)}
        </span>
      </div>
      <h4 className="mt-2 text-[13px] font-semibold leading-snug text-[#CBD5E1] line-clamp-2">
        {insight.title}
      </h4>
      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#64748B]/50">
        {insight.description}
      </p>
      <div className="mt-2.5 pt-2.5 border-t border-[#1E293B]/50 flex justify-end">
        <button
          type="button"
          onClick={() => onRestore(insight.id)}
          title="Volver a pendientes"
          className="inline-flex items-center gap-1 rounded-sm border border-[#1E293B]/80 bg-white/[0.02] px-2 py-1 text-[10px] font-medium text-[#94A3B8] transition hover:border-[#334155]/60 hover:text-[#E2E8F0]"
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
          Restaurar
        </button>
      </div>
    </div>
  );
}

function InsightCard({ insight, onAnalyze }: InsightCardProps) {
  const cfg = SEVERITY_CONFIG[insight.severity];
  const cta = CTA_PROPS;

  return (
    <div className={DASHBOARD_METRIC_LIST_ITEM_CLASS}>
      <div className="flex items-center gap-1.5">
        <span
          className={`text-[8px] px-1.5 py-px rounded font-semibold uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
          {insight.severity}
        </span>
        <span className="text-[8px] text-[#64748B]/60 bg-[#1E293B]/60 px-1.5 py-px rounded">
          {insight.category}
        </span>
        <span className="ml-auto shrink-0 text-[8px] font-mono text-[#64748B]/60">
          Impact:{" "}
          <span className={`font-bold ${cfg.text}`}>{insight.impact}</span>
        </span>
      </div>

      <h4 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug text-[#E2E8F0]">
        {insight.title}
      </h4>

      <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#64748B]/60">
        {insight.description}
      </p>

      <div className="mt-2.5 pt-2.5 border-t border-[#1E293B]/60 flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[8px] text-[#64748B]/60 min-w-0">
          <span className="opacity-40">·</span>
          <span className="truncate">{insight.lastUpdated}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => onAnalyze(insight)}
            className={cta.className}
          >
            <FontAwesomeIcon icon={cta.icon} className={cta.iconClassName} />
            <span className={cta.labelClassName}>{cta.label}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsInsights({
  data,
  isLoading = false,
  isError = false,
  errorMessage = null,
}: AnalyticsInsightsProps) {
  const navigate = useNavigationStore((state) => state.navigate);
  const setPendingPrompt = useNavigationStore(
    (state) => state.setPendingPrompt,
  );

  const analyzedHistory = useInsightsStore((state) => state.analyzedHistory);
  const beginAnalysis = useInsightsStore((state) => state.beginAnalysis);
  const restoreToPending = useInsightsStore((state) => state.restoreToPending);
  const resetHistory = useInsightsStore((state) => state.resetHistory);

  const [view, setView] = useState<DashboardViewMode>("current");
  const [selectedSeverity, setSelectedSeverity] =
    useState<SeverityFilterKey | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const analyzedIdSet = useMemo(
    () => new Set(analyzedHistory.map((row) => row.insight.id)),
    [analyzedHistory],
  );

  const pendingInsights = useMemo(
    () =>
      data.analyticsInsights.filter(
        (insight) => !analyzedIdSet.has(insight.id),
      ),
    [data.analyticsInsights, analyzedIdSet],
  );

  const historyRows = useMemo(
    () =>
      [...analyzedHistory].sort(
        (a, b) => Date.parse(b.analyzedAt) - Date.parse(a.analyzedAt),
      ),
    [analyzedHistory],
  );

  const statsSource = useMemo(
    () =>
      view === "current"
        ? pendingInsights
        : historyRows.map((row) => row.insight),
    [view, pendingInsights, historyRows],
  );

  useEffect(() => {
    if (
      selectedSeverity &&
      statsSource.some((insight) => insight.severity === selectedSeverity)
    ) {
      return;
    }
    const first = SEVERITY_FILTER_ORDER.find((key) =>
      statsSource.some((insight) => insight.severity === key),
    );
    setSelectedSeverity(first ?? null);
  }, [statsSource, view, data.analyticsInsights.length]);

  const severityFilteredPending = useMemo(
    () =>
      selectedSeverity
        ? pendingInsights.filter(
            (insight) => insight.severity === selectedSeverity,
          )
        : pendingInsights,
    [pendingInsights, selectedSeverity],
  );

  const severityFilteredHistory = useMemo(
    () =>
      selectedSeverity
        ? historyRows.filter(
            (row) => row.insight.severity === selectedSeverity,
          )
        : historyRows,
    [historyRows, selectedSeverity],
  );

  const sortedInsights = useMemo(
    () => [...severityFilteredPending].sort(compareInsightsByPriority),
    [severityFilteredPending],
  );

  const listLength =
    view === "current"
      ? sortedInsights.length
      : severityFilteredHistory.length;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(listLength / INSIGHTS_PER_PAGE)),
    [listLength],
  );

  const safePage = Math.min(currentPage, totalPages - 1);

  const pageInsights = useMemo(
    () =>
      sortedInsights.slice(
        safePage * INSIGHTS_PER_PAGE,
        safePage * INSIGHTS_PER_PAGE + INSIGHTS_PER_PAGE,
      ),
    [sortedInsights, safePage],
  );

  const pageHistory = useMemo(
    () =>
      severityFilteredHistory.slice(
        safePage * INSIGHTS_PER_PAGE,
        safePage * INSIGHTS_PER_PAGE + INSIGHTS_PER_PAGE,
      ),
    [severityFilteredHistory, safePage],
  );

  const pageStart = listLength === 0 ? 0 : safePage * INSIGHTS_PER_PAGE + 1;
  const pageEnd = Math.min((safePage + 1) * INSIGHTS_PER_PAGE, listLength);
  const canGoPrev = safePage > 0;
  const canGoNext = safePage < totalPages - 1;

  useEffect(() => {
    setCurrentPage(0);
  }, [
    selectedSeverity,
    data.analyticsInsights.length,
    view,
    analyzedHistory.length,
  ]);

  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  const handleAnalyze = (insight: AnalyticsInsight) => {
    beginAnalysis(insight);
    setPendingPrompt(buildInsightPrompt(insight));
    navigate("chat-ia");
  };

  const selectedSeverityLabel =
    SEVERITY_STATS.find((s) => s.key === selectedSeverity)?.label ?? null;

  const handleSeveritySelect = (key: SeverityFilterKey) => {
    setSelectedSeverity(key);
    setCurrentPage(0);
  };

  return (
    <div className={DASHBOARD_METRIC_CARD_CLASS}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />

      <DashboardMetricCardHeader
        title="Analytics Insights"
        subtitle={
          view === "current"
            ? "AI-driven intelligence · Señales pendientes de análisis"
            : "Insights enviados al chat de inteligencia competitiva"
        }
        view={view}
        onViewChange={setView}
      />

      <div className={DASHBOARD_METRIC_STATS_GRID_CLASS}>
        {SEVERITY_STATS.map(({ key, label, color }) => {
          const count = statsSource.filter(
            (insight) => insight.severity === key,
          ).length;
          const hasItems = count > 0;
          return (
            <DashboardMetricStatTile
              key={key}
              value={count}
              label={label}
              valueClassName={color}
              selected={selectedSeverity === key && hasItems}
              onClick={
                hasItems ? () => handleSeveritySelect(key) : undefined
              }
              title={label}
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
              Cargando insights desde el backend…
            </p>
            <p className="text-[10px] text-[#64748B]/70">
              Consultando analyzed_posts (puede tardar si la BD remota está
              lenta).
            </p>
          </div>
        ) : isError ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-[#FF4C4C]/30 bg-[#FF4C4C]/5 px-4 py-6 text-center">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="text-[20px] text-[#FF4C4C]"
            />
            <p className="text-[12px] font-semibold text-[#FCA5A5]">
              No se pudieron cargar los insights
            </p>
            <p className="text-[10px] text-[#64748B]/80 max-w-[280px]">
              {errorMessage || "Error de conexión con la API."}
            </p>
            <p className="text-[10px] text-[#64748B]/60 max-w-[320px]">
              El backend responde pero no conecta a PostgreSQL. Revisa{" "}
              <span className="font-mono text-[#94A3B8]">DATABASE_URL</span> en
              el <span className="font-mono text-[#94A3B8]">.env</span> del
              backend y que el servicio esté accesible desde tu red.
            </p>
          </div>
        ) : listLength === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#1E293B]/80 bg-white/[0.02] px-4 py-6 text-center">
            {view === "history" ? (
              <>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className="text-[22px] text-[#64748B]"
                />
                <p className="text-[12px] font-semibold text-[#E2E8F0]">
                  Historial vacío
                </p>
                <p className="text-[10px] text-[#64748B]/70">
                  Los insights aparecerán aquí después de analizarlos en el chat
                  y pulsar enviar.
                </p>
              </>
            ) : data.analyticsInsights.length === 0 ? (
              <>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className="text-[22px] text-[#64748B]"
                />
                <p className="text-[12px] font-semibold text-[#E2E8F0]">
                  Sin insights en la base de datos
                </p>
                <p className="text-[10px] text-[#64748B]/70">
                  El API respondió correctamente pero no hay registros en
                  analyzed_posts (o ninguno cumple los filtros de severidad).
                </p>
              </>
            ) : pendingInsights.length === 0 && historyRows.length > 0 ? (
              <>
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="text-[22px] text-[#3DDC84]"
                />
                <p className="text-[12px] font-semibold text-[#E2E8F0]">
                  Todos los insights fueron analizados
                </p>
                <p className="text-[10px] text-[#64748B]/70">
                  Consulta el historial para revisarlos o restaurarlos.
                </p>
                <button
                  type="button"
                  onClick={() => setView("history")}
                  className="mt-1 text-[10px] font-medium text-[#94A3B8] underline-offset-2 hover:text-[#E2E8F0] hover:underline"
                >
                  Ver historial ({historyRows.length})
                </button>
              </>
            ) : statsSource.length > 0 && selectedSeverityLabel ? (
              <>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className="text-[22px] text-[#64748B]"
                />
                <p className="text-[12px] font-semibold text-[#E2E8F0]">
                  Sin insights {selectedSeverityLabel} en esta vista
                </p>
                <p className="text-[10px] text-[#64748B]/70">
                  Prueba otra severidad o cambia a Historial.
                </p>
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faInfoCircle}
                  className="text-[22px] text-[#64748B]"
                />
                <p className="text-[12px] font-semibold text-[#E2E8F0]">
                  Sin insights en esta vista
                </p>
                <p className="text-[10px] text-[#64748B]/70">
                  Prueba otra severidad o cambia a Historial.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="flex min-h-[200px] items-stretch gap-1.5">
            {totalPages > 1 && (
              <button
                type="button"
                aria-label={
                  view === "current"
                    ? "Insights anteriores"
                    : "Historial anterior"
                }
                disabled={!canGoPrev}
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                className={DASHBOARD_METRIC_NAV_ARROW_CLASS}
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-[11px]" />
              </button>
            )}

            <div className="flex-1 min-w-0 space-y-2">
              {view === "current"
                ? pageInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onAnalyze={handleAnalyze}
                    />
                  ))
                : pageHistory.map((row) => (
                    <HistoryInsightCard
                      key={row.insight.id}
                      insight={row.insight}
                      analyzedAt={row.analyzedAt}
                      onRestore={restoreToPending}
                    />
                  ))}
            </div>

            {totalPages > 1 && (
              <button
                type="button"
                aria-label={
                  view === "current"
                    ? "Siguientes insights"
                    : "Siguiente historial"
                }
                disabled={!canGoNext}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                }
                className={DASHBOARD_METRIC_NAV_ARROW_CLASS}
              >
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="text-[11px]"
                />
              </button>
            )}
          </div>
        )}
      </div>

      <div className={DASHBOARD_METRIC_FOOTER_CLASS}>
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
              onClick={resetHistory}
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
                <span className="text-[#94A3B8]">{pendingInsights.length}</span>{" "}
                pendientes
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
