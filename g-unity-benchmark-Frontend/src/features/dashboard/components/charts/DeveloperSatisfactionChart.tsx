import { useMemo, useState } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../../../../utils/cn";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
  DASHBOARD_METRIC_HEADER_CHART_GAP_CLASS,
} from "./DashboardViewToggle";

interface DeveloperSatisfactionData {
  dimensions: Array<{
    name: string;
    unity: number;
    unreal: number;
    godot: number;
  }>;
}

type CompetitorKey = "unreal" | "godot";

const COMPETITOR_OPTIONS: { key: CompetitorKey; label: string }[] = [
  { key: "unreal", label: "Unreal" },
  { key: "godot", label: "Godot" },
];

const COMPETITOR_STROKE: Record<CompetitorKey, string> = {
  unreal: "#8B5CF6",
  godot: "#10B981",
};

interface DeveloperSatisfactionChartProps {
  data: DeveloperSatisfactionData;
}

export default function DeveloperSatisfactionChart({
  data,
}: DeveloperSatisfactionChartProps) {
  const { dimensions } = data;
  const [competitor, setCompetitor] = useState<CompetitorKey>("godot");

  const selectedLabel =
    COMPETITOR_OPTIONS.find((o) => o.key === competitor)?.label ?? "Competidor";

  const chartData = useMemo(
    () =>
      dimensions.map((d) => ({
        name: d.name,
        unity: d.unity,
        competitor: d[competitor],
      })),
    [dimensions, competitor],
  );

  const footerInsights = useMemo(() => {
    let bestDim = dimensions[0];
    let bestVal = -1;
    let maxGapDim = dimensions[0];
    let maxGap = -Infinity;
    for (const d of dimensions) {
      const v = d[competitor];
      if (v > bestVal) {
        bestVal = v;
        bestDim = d;
      }
      const gap = d[competitor] - d.unity;
      if (gap > maxGap) {
        maxGap = gap;
        maxGapDim = d;
      }
    }
    let unityLeadDim = dimensions[0];
    let unityLeadGap = -Infinity;
    for (const d of dimensions) {
      const lead = d.unity - d[competitor];
      if (lead > unityLeadGap) {
        unityLeadGap = lead;
        unityLeadDim = d;
      }
    }
    return { bestDim, bestVal, maxGapDim, maxGap, unityLeadDim, unityLeadGap };
  }, [dimensions, competitor]);

  return (
    <div className={cn(DASHBOARD_METRIC_CARD_CLASS, "w-full")}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />
      <div className="relative z-10 flex flex-1 min-h-[320px] gap-4">
        {/* Left column — controls + insights */}
        <div className="flex w-[38%] min-w-0 shrink-0 flex-col">
          <div
            className={cn(
              "relative z-10 shrink-0 pt-3",
              DASHBOARD_METRIC_HEADER_CHART_GAP_CLASS,
            )}
          >
            <h3 className="min-w-0 pr-1 text-[15px] font-semibold tracking-[0.04em] text-[#E2E8F0]">
              Satisfacción de Desarrolladores
            </h3>
          </div>

          <p className="mb-1 text-[13px] leading-[1.45] text-[#64748B]/60">
            Comparar contra:
          </p>
          <div
            role="tablist"
            aria-label="Competidor a comparar con Unity"
            className="inline-flex w-fit max-w-full items-center gap-0.5 rounded-md border-0 bg-[#0A0B0D] p-px"
          >
            {COMPETITOR_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={competitor === key}
                onClick={() => setCompetitor(key)}
                className={cn(
                  "cursor-pointer border-0 rounded-[4px] px-1.5 py-px text-[9px] font-semibold leading-none transition-all duration-150 ease-out",
                  competitor === key
                    ? "bg-[rgba(110,193,255,0.14)] text-white/90"
                    : "bg-transparent text-[#6B7280] hover:text-[#9CA3AF]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-6 mb-2 border-t border-[#1E293B]/80" />

          <p className="mt-1 text-xs font-medium text-[#64748B]">
            Señales clave
          </p>

          <div className="mt-2 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <div
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: COMPETITOR_STROKE[competitor] }}
              />
              <p className="text-xs leading-snug text-[#64748B]">
                {selectedLabel} destaca en {footerInsights.bestDim.name} (
                {footerInsights.bestVal})
              </p>
            </div>

            <div className="flex items-start gap-2">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FCA5A5]" />
              <p className="text-xs leading-snug text-[#64748B]">
                {footerInsights.maxGap > 0 ? (
                  <>
                    Mayor brecha a favor de {selectedLabel} en{" "}
                    {footerInsights.maxGapDim.name} ( +
                    {Math.round(footerInsights.maxGap)} pts vs Unity)
                  </>
                ) : (
                  <>
                    Unity mantiene ventaja en {footerInsights.unityLeadDim.name}{" "}
                    ( +{Math.round(footerInsights.unityLeadGap)} pts vs{" "}
                    {selectedLabel})
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right column — radar chart */}
        <div className="dev-satisfaction-radar-chart flex min-h-0 min-w-0 flex-1 overflow-visible px-1 [&_.recharts-wrapper]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-surface_*]:outline-none">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={0}
          >
            <RadarChart
              data={chartData}
              cx="50%"
              cy="51%"
              outerRadius="78%"
              margin={{ top: 16, right: 20, bottom: 8, left: 28 }}
            >
              <PolarGrid stroke="#374151" strokeWidth={0.5} radialLines />
              <PolarAngleAxis
                dataKey="name"
                stroke="#64748B"
                tickLine={false}
                tick={(tickProps) => {
                  const { x, y, cx, cy, payload, textAnchor } =
                    tickProps as unknown as {
                      x: number;
                      y: number;
                      cx: number;
                      cy: number;
                      payload: { value: string };
                      textAnchor: "start" | "middle" | "end" | "inherit";
                    };
                  const dx = x < cx ? -6 : x > cx ? 6 : 0;
                  const dy = y < cy - 4 ? -10 : y > cy + 4 ? 8 : 0;
                  return (
                    <text
                      x={x + dx}
                      y={y + dy}
                      textAnchor={textAnchor}
                      fill="#64748B"
                      fontSize={8}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                stroke="#64748B"
                tickLine={false}
                tickCount={6}
                tick={(tickProps) => {
                  const { x, y, cy, payload } = tickProps as unknown as {
                    x: number;
                    y: number;
                    cy: number;
                    payload: { value: number };
                  };
                  const isTopTick = y < cy - 4;
                  const dy = isTopTick && payload.value === 100 ? 6 : 0;
                  return (
                    <text
                      x={x}
                      y={y + dy}
                      textAnchor="middle"
                      fill="#64748B"
                      fontSize={8}
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              {/* Unity reference layer — always visible behind the competitor */}
              <Radar
                name="Unity"
                dataKey="unity"
                stroke="#22D3EE"
                fill="#22D3EE"
                fillOpacity={0.1}
                strokeWidth={1.5}
              />
              {/* Selected competitor — rendered on top */}
              <Radar
                name={selectedLabel}
                dataKey="competitor"
                stroke={COMPETITOR_STROKE[competitor]}
                fill={COMPETITOR_STROKE[competitor]}
                fillOpacity={0.2}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
