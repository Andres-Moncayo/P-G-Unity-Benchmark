import { cn } from "../../../../utils/cn";

export type DashboardViewMode = "current" | "history";

/** Espacio fijo entre subtítulo y área de gráfico (20px). */
export const DASHBOARD_METRIC_HEADER_CHART_GAP_CLASS = "mb-5";

/**
 * Altura estable del bloque Actual/Historial (alineada con la vista Historial).
 * Evita reflow al alternar: el padre conserva tamaño y solo cambia el contenido.
 */
export const DASHBOARD_METRIC_VIEW_SLOT_CLASS =
  "min-h-[min(11.5rem,35vh)] sm:min-h-[min(12rem,32vh)]";

/** Contenedor de tarjetas métricas: hover unificado y suave (sin gradiente dual). */
export const DASHBOARD_METRIC_CARD_CLASS =
  "group relative flex h-full min-h-0 w-full min-w-0 flex-col rounded-lg bg-gray-900/70 p-3 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/20 sm:p-4";

/** Overlay cyan único al hover de la tarjeta (mismo tono que el toggle activo). */
export const DASHBOARD_METRIC_CARD_OVERLAY_CLASS =
  "pointer-events-none absolute inset-0 rounded-lg transition-colors duration-300 group-hover:bg-[rgba(110,193,255,0.04)]";

/** Grid superior de 4 KPIs (severidades o categorías de bug). */
export const DASHBOARD_METRIC_STATS_GRID_CLASS =
  "relative z-10 grid grid-cols-4 gap-2 mb-4";

/** Celda KPI: misma altura en Technical Friction y Analytics Insights. */
export const DASHBOARD_METRIC_STAT_TILE_CLASS =
  "flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border border-[#1E293B]/80 bg-white/[0.02] p-2 text-center";

export const DASHBOARD_METRIC_STAT_VALUE_CLASS =
  "text-base font-bold font-mono leading-none tabular-nums";

export const DASHBOARD_METRIC_STAT_LABEL_CLASS =
  "mt-0.5 max-w-full truncate px-0.5 text-[9px] text-[#64748B]/60";

/** Tarjeta de item en listado (insight / issue). */
export const DASHBOARD_METRIC_LIST_ITEM_CLASS =
  "rounded-lg border border-[#1E293B]/80 bg-white/[0.02] p-3 transition-all duration-200 hover:bg-white/[0.04] hover:border-[#334155]/60";

/** Pie de paginación compartido. */
export const DASHBOARD_METRIC_FOOTER_CLASS =
  "relative z-10 mt-4 flex items-center justify-between gap-2 border-t border-[#1E293B]/60 pt-3";

type DashboardMetricStatTileProps = {
  value: number | string;
  label: string;
  valueClassName?: string;
  selected?: boolean;
  onClick?: () => void;
  title?: string;
};

export function DashboardMetricStatTile({
  value,
  label,
  valueClassName = "text-[#E2E8F0]",
  selected = false,
  onClick,
  title,
}: DashboardMetricStatTileProps) {
  const tileClass = cn(
    DASHBOARD_METRIC_STAT_TILE_CLASS,
    selected &&
      "border-[rgba(110,193,255,0.45)] bg-[rgba(110,193,255,0.1)] shadow-sm shadow-[rgba(110,193,255,0.12)]",
    onClick &&
      "cursor-pointer transition-all duration-200 hover:border-[#334155]/60 hover:bg-white/[0.04]",
  );

  const content = (
    <>
      <div className={cn(DASHBOARD_METRIC_STAT_VALUE_CLASS, valueClassName)}>
        {value}
      </div>
      <div className={DASHBOARD_METRIC_STAT_LABEL_CLASS}>{label}</div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" title={title ?? label} onClick={onClick} className={tileClass}>
        {content}
      </button>
    );
  }

  return (
    <div title={title ?? label} className={tileClass}>
      {content}
    </div>
  );
}

/** Flechas de paginación compartidas (Analytics Insights, Technical Friction). */
export const DASHBOARD_METRIC_NAV_ARROW_CLASS = cn(
  "shrink-0 flex w-7 items-center justify-center self-stretch rounded-md",
  "border border-[#1E293B]/80 bg-white/[0.02] text-[#94A3B8]",
  "transition-all duration-200",
  "hover:border-[#334155]/60 hover:bg-white/[0.04] hover:text-[#E2E8F0]",
  "disabled:cursor-not-allowed disabled:opacity-30",
  "disabled:hover:border-[#1E293B]/80 disabled:hover:bg-white/[0.02] disabled:hover:text-[#94A3B8]",
);

const SEGMENTS = [
  { mode: "current" as const, label: "Actual" },
  { mode: "history" as const, label: "Historial" },
] as const;

type ToggleProps = {
  view: DashboardViewMode;
  onChange: (v: DashboardViewMode) => void;
  className?: string;
};

function DashboardViewToggle({ view, onChange, className }: ToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Vista de métrica"
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-md border-0 bg-[#0A0B0D] p-px",
        className,
      )}
    >
      {SEGMENTS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          role="tab"
          aria-selected={view === mode}
          onClick={() => onChange(mode)}
          className={cn(
            "cursor-pointer border-0 rounded-[5px] px-2 py-0.5 text-[10px] font-semibold leading-none transition-all duration-150 ease-out",
            view === mode
              ? "bg-[rgba(110,193,255,0.14)] text-white/90"
              : "bg-transparent text-[#6B7280] hover:text-[#9CA3AF]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

type HeaderProps = {
  title: string;
  subtitle: string;
  view: DashboardViewMode;
  onViewChange: (v: DashboardViewMode) => void;
};

/**
 * Cabecera métrica unificada: título + toggle en línea, subtítulo debajo, ritmo fijo.
 */
export function DashboardMetricCardHeader({
  title,
  subtitle,
  view,
  onViewChange,
}: HeaderProps) {
  return (
    <div
      className={cn(
        "relative z-10 shrink-0 pt-3",
        DASHBOARD_METRIC_HEADER_CHART_GAP_CLASS,
      )}
    >
      <div className="flex min-h-[2.5rem] items-center justify-between gap-2.5">
        <h3 className="min-w-0 flex-1 pr-1 text-[15px] font-semibold tracking-[0.04em] text-[#E2E8F0]">
          {title}
        </h3>
        <DashboardViewToggle view={view} onChange={onViewChange} />
      </div>
      <p className="mt-1 line-clamp-2 min-h-[2.375rem] text-[13px] leading-[1.45] text-[#64748B]/60">
        {subtitle}
      </p>
    </div>
  );
}
