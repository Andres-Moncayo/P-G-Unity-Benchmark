import { useState } from "react";
import {
  Tooltip,
  Pie,
  ResponsiveContainer,
  Cell,
  PieChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { cn } from "../../../../utils/cn";
import {
  DashboardMetricCardHeader,
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
  DASHBOARD_METRIC_VIEW_SLOT_CLASS,
  type DashboardViewMode,
} from "./DashboardViewToggle";

interface MarketShareChartProps {
  data: {
    unity: number;
    unreal: number;
    godot: number;
    history: Array<{
      month: string;
      unity: number;
      unreal: number;
      godot: number;
    }>;
  };
}

const COLORS = {
  unreal: "#C4B5FD",
  unity: "#7DD3FC",
  godot: "#6EE7B7",
};

export default function MarketShareChart({ data }: MarketShareChartProps) {
  const [view, setView] = useState<DashboardViewMode>("current");

  const currentData = [
    { name: "Unreal", value: data.unreal, color: COLORS.unreal },
    { name: "Unity", value: data.unity, color: COLORS.unity },
    { name: "Godot", value: data.godot, color: COLORS.godot },
  ];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      payload: { name: string; value: number; color: string };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-lg border border-[#334155] bg-[#1E293B]/95 p-3 shadow-2xl backdrop-blur-xl">
          <p className="text-sm font-medium text-[#F1F5F9]">{item.name}</p>
          <p className="text-sm font-bold" style={{ color: item.color }}>
            {item.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn(DASHBOARD_METRIC_CARD_CLASS, "!pb-2.5 sm:!pb-3.5")}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />

      <DashboardMetricCardHeader
        title="Market Share Shift"
        subtitle={
          view === "current"
            ? "Cross-benchmark • 2026"
            : "Evolución trimestral (%)"
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
        {view === "current" ? (
          <div className="flex h-full min-h-0 w-full max-w-full flex-col justify-center px-1 pt-0">
            <div className="flex w-full shrink-0 items-center justify-center gap-6 sm:gap-8 px-2 py-1">
              <div className="relative aspect-square h-[min(11rem,32vh)] w-full max-w-[min(11rem,100%)] shrink-0">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={currentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      paddingAngle={6}
                      cornerRadius={10}
                      dataKey="value"
                      stroke="none"
                      strokeWidth={0}
                      activeShape={{ stroke: "none", strokeWidth: 0 }}
                      isAnimationActive={false}
                    >
                      {currentData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="none"
                          strokeWidth={0}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-2.5 text-left shrink-0">
                {currentData.map((item) => (
                  <div
                    key={item.name}
                    className="flex cursor-default items-center gap-2"
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-[#94A3B8] w-12 font-medium">
                      {item.name}
                    </span>
                    <span className="text-xs font-semibold text-[#F1F5F9]">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1" aria-hidden />
          </div>
        ) : (
          <div className="dashboard-metric-history-chart flex h-full min-h-0 w-full flex-1 flex-col items-stretch px-0 py-0.5 sm:py-1">
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
            >
              <LineChart
                data={data.history}
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
                  width={28}
                  domain={[8, 42]}
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
                  dataKey="unity"
                  name="Unity"
                  stroke={COLORS.unity}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="unreal"
                  name="Unreal"
                  stroke={COLORS.unreal}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="godot"
                  name="Godot"
                  stroke={COLORS.godot}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
