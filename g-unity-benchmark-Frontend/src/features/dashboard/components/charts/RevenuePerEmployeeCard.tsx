import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faMinus,
} from "@fortawesome/free-solid-svg-icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../../../../utils/cn";
import {
  DashboardMetricCardHeader,
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
  DASHBOARD_METRIC_VIEW_SLOT_CLASS,
  type DashboardViewMode,
} from "./DashboardViewToggle";

interface CompetitorData {
  name: string;
  value: string;
  color: string;
}

interface RevenuePerEmployeeCardProps {
  data: {
    current: string;
    delta: string;
    trend: "up" | "down" | "stable";
    previousQuarter?: string;
    competitors: CompetitorData[];
    history: Array<{
      label: string;
      unityK: number;
      epicK: number;
      godotK: number;
    }>;
  };
}

const PASTEL_COLORS: Record<string, string> = {
  "Epic/Unreal": "#C4B5FD",
  "Godot Fdn": "#6EE7B7",
  GameMaker: "#FCD34D",
  Unity: "#7DD3FC",
};

export default function RevenuePerEmployeeCard({
  data,
}: RevenuePerEmployeeCardProps) {
  const { current, delta, trend, competitors, history } = data;
  const [view, setView] = useState<DashboardViewMode>("current");

  const trendIcon =
    trend === "up" ? faArrowUp : trend === "down" ? faArrowDown : faMinus;
  const trendColor =
    trend === "up" ? "#6EE7B7" : trend === "down" ? "#FCA5A5" : "#94A3B8";
  const trendBg =
    trend === "up"
      ? "border-[#6EE7B7]/20 bg-[#6EE7B7]/10"
      : trend === "down"
        ? "border-[#FCA5A5]/20 bg-[#FCA5A5]/10"
        : "border-[#94A3B8]/20 bg-[#94A3B8]/10";

  const currentValue = parseFloat(current.replace(/[^0-9.]/g, ""));
  const allValues = [
    currentValue,
    ...competitors.map((c) => parseFloat(c.value.replace(/[^0-9.]/g, ""))),
  ];
  const maxValue = Math.max(...allValues);

  const historyChart = history.map((row) => ({
    period: row.label,
    Unity: row.unityK,
    Epic: row.epicK,
    Godot: row.godotK,
  }));

  return (
    <div className={cn(DASHBOARD_METRIC_CARD_CLASS, "!pb-2.5 sm:!pb-3.5")}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />

      <DashboardMetricCardHeader
        title="Revenue per Employee"
        subtitle={
          view === "current"
            ? "Eficiencia operativa cross-benchmark"
            : "Tendencia por trimestre ($K FTE)"
        }
        view={view}
        onViewChange={setView}
      />

      <div
        className={cn(
          "relative z-10 w-full flex-1",
          DASHBOARD_METRIC_VIEW_SLOT_CLASS,
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex min-h-0 flex-col overflow-hidden transition-opacity duration-[250ms] ease-out",
            view === "current"
              ? "z-10 opacity-100"
              : "pointer-events-none z-0 opacity-0",
          )}
          aria-hidden={view !== "current"}
        >
          <div className="flex h-full min-h-0 w-full flex-1 flex-col justify-start pt-1">
            <div className="mb-3 flex shrink-0 flex-wrap items-baseline gap-2 sm:gap-2">
              <span className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
                {current}
              </span>
              <div
                className={`flex items-center gap-1 rounded-md border px-1 py-0.5 ${trendBg}`}
              >
                <FontAwesomeIcon
                  icon={trendIcon}
                  className="h-2.5 w-2.5"
                  style={{ color: trendColor }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: trendColor }}
                >
                  {delta}
                </span>
              </div>
              <span className="text-xs text-[#64748B]">
                {data.previousQuarter
                  ? `vs ${data.previousQuarter}`
                  : "vs trimestre anterior"}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {competitors.map((comp) => {
                const compValue = parseFloat(
                  comp.value.replace(/[^0-9.]/g, ""),
                );
                const barWidth = `${(compValue / maxValue) * 100}%`;
                const pastelColor = PASTEL_COLORS[comp.name] || comp.color;

                return (
                  <div
                    key={comp.name}
                    className="group/bar flex cursor-default items-center gap-1.5 rounded-md px-0.5 py-0.5 transition-all duration-300 hover:bg-white/5 sm:gap-2"
                  >
                    <div className="flex min-w-0 shrink-0 basis-[5.5rem] items-center gap-2 sm:basis-24">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300 group-hover/bar:scale-125"
                        style={{ backgroundColor: pastelColor }}
                      />
                      <span className="truncate text-xs text-[#94A3B8] transition-colors group-hover/bar:text-[#F1F5F9]">
                        {comp.name}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#374151]/40">
                        <div
                          className="relative h-full rounded-full transition-all duration-700 ease-out group-hover/bar:brightness-110"
                          style={{
                            width: barWidth,
                            backgroundColor: pastelColor,
                          }}
                        >
                          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover/bar:translate-x-full" />
                        </div>
                      </div>
                    </div>
                    <span
                      className="w-[3rem] shrink-0 text-right text-xs font-semibold transition-colors duration-300 group-hover/bar:text-white sm:w-[3.5rem]"
                      style={{ color: pastelColor }}
                    >
                      {comp.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "absolute inset-0 flex min-h-0 flex-col overflow-hidden transition-opacity duration-[250ms] ease-out",
            view === "history"
              ? "z-10 opacity-100"
              : "pointer-events-none z-0 opacity-0",
          )}
          aria-hidden={view !== "history"}
        >
          <div className="dashboard-metric-history-chart flex h-full min-h-0 w-full flex-1 flex-col items-stretch px-0 py-0.5 sm:py-1">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <LineChart
                data={historyChart}
                margin={{ top: 0, right: 4, left: -2, bottom: 2 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  strokeOpacity={0.45}
                />
                <XAxis
                  dataKey="period"
                  stroke="#64748B"
                  tick={{ fill: "#64748B", fontSize: 8 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: "#64748B", fontSize: 8 }}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  iconType="line"
                  iconSize={14}
                  wrapperStyle={{
                    fontSize: "11px",
                    lineHeight: 1.35,
                    paddingTop: 4,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Unity"
                  stroke="#7DD3FC"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Epic"
                  stroke="#C4B5FD"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="Godot"
                  stroke="#6EE7B7"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
