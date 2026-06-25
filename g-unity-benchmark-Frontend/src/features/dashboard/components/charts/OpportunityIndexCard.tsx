import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowUp,
  faArrowDown,
  faMinus,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../../../utils/cn";
import {
  DashboardMetricCardHeader,
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
  DASHBOARD_METRIC_VIEW_SLOT_CLASS,
  type DashboardViewMode,
} from "./DashboardViewToggle";

interface OpportunityIndexCardProps {
  data: {
    score: number;
    trend: "up" | "down" | "stable";
    change: string;
    previousQuarter?: string;
    opportunities: Array<{
      area: string;
      priority: "high" | "medium" | "low";
      description: string;
    }>;
  };
  adoptionHistory: {
    base: number;
    unity: Array<{ month: string; value: number }>;
    unreal: Array<{ month: string; value: number }>;
    godot: Array<{ month: string; value: number }>;
  };
}

const COLORS = {
  primary: "#7DD3FC",
  bg: "rgba(255,255,255,0.06)",
};

const getTrendIcon = (trend: "up" | "down" | "stable") => {
  switch (trend) {
    case "up":
      return (
        <FontAwesomeIcon icon={faArrowUp} className="h-3 w-3 text-[#6EE7B7]" />
      );
    case "down":
      return (
        <FontAwesomeIcon
          icon={faArrowDown}
          className="h-3 w-3 text-[#FCA5A5]"
        />
      );
    default:
      return (
        <FontAwesomeIcon icon={faMinus} className="h-3 w-3 text-[#94A3B8]" />
      );
  }
};

export default function OpportunityIndexCard({
  data,
  adoptionHistory,
}: OpportunityIndexCardProps) {
  const { score, trend, change } = data;
  const [view, setView] = useState<DashboardViewMode>("current");

  const pieData = [
    { name: "Score", value: score },
    { name: "Remaining", value: 100 - score },
  ];

  const relativeIndexSeries = adoptionHistory.unity.map((item, index) => ({
    month: item.month,
    unity: item.value,
    unreal: adoptionHistory.unreal[index]?.value ?? 0,
    godot: adoptionHistory.godot[index]?.value ?? 0,
  }));

  return (
    <div className={cn(DASHBOARD_METRIC_CARD_CLASS, "!pb-2.5 sm:!pb-3.5")}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />

      <DashboardMetricCardHeader
        title="Opportunity Index"
        subtitle={
          view === "current"
            ? "Viabilidad de vender servicios a Unity"
            : `Índice relativo • Base ${adoptionHistory.base} = Unity Ene 2023`
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
          <div className="flex h-full min-h-0 w-full flex-col justify-start px-0 pt-0">
            <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="relative mx-auto aspect-square h-[min(11rem,32vh)] w-full max-w-[min(13rem,100%)] shrink-0 sm:mx-0 sm:w-[min(48%,12.5rem)]">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      startAngle={90}
                      endAngle={-270}
                      innerRadius="52%"
                      outerRadius="86%"
                      strokeWidth={0}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      <Cell fill={COLORS.primary} />
                      <Cell fill={COLORS.bg} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold tracking-tight text-[#F1F5F9]">
                    {score}
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col flex-wrap justify-center gap-1 text-left sm:mx-[60px] sm:border-l sm:border-[#1E293B]/80 sm:px-0">
                <div className="flex items-center gap-1.5">
                  {getTrendIcon(trend)}
                  <span
                    className={`text-xs font-medium sm:text-sm ${
                      trend === "up"
                        ? "text-[#6EE7B7]"
                        : trend === "down"
                          ? "text-[#FCA5A5]"
                          : "text-[#94A3B8]"
                    }`}
                  >
                    {change}
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">
                  {data.previousQuarter
                    ? `vs ${data.previousQuarter}`
                    : "vs trimestre anterior"}
                </p>
              </div>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
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
                data={relativeIndexSeries}
                margin={{ top: 0, right: 4, left: -2, bottom: 2 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  strokeOpacity={0.45}
                />
                <XAxis
                  dataKey="month"
                  stroke="#64748B"
                  tick={{ fill: "#64748B", fontSize: 8 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  tick={{ fill: "#64748B", fontSize: 8 }}
                  tickLine={false}
                  width={24}
                  domain={[60, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                  labelStyle={{ color: "#94A3B8" }}
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
                  dataKey="unity"
                  name="Unity"
                  stroke="#7DD3FC"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="unreal"
                  name="Unreal"
                  stroke="#C4B5FD"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="godot"
                  name="Godot"
                  stroke="#6EE7B7"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
