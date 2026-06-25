import { useMemo } from "react";
import { cn } from "../../../../utils/cn";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
} from "./DashboardViewToggle";
import { useDashboardHighlights } from "../../hooks/useDashboardHighlights";
import RealTimeAlertsMonitor from "./RealTimeAlertsMonitor";
import HighlightsPanel from "./HighlightsPanel";

interface RealTimeIntelligenceSectionProps {
  data: {
    feeds: number;
    forums: number;
    news: number;
    reports: number;
    social: number;
    total_posts?: number;
    alerts_total?: number;
    alerts: Array<{
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
}

function StatTile({
  value,
  label,
  color,
  loading = false,
}: {
  value: number | string;
  label: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[#1E293B]/80 bg-white/[0.02] p-2 text-center">
      <div
        className={cn(
          "text-base font-bold font-mono",
          loading ? "text-[#64748B]/50" : color,
        )}
      >
        {loading ? "—" : value}
      </div>
      <div className="mt-0.5 text-[9px] text-[#64748B]/60">{label}</div>
    </div>
  );
}

export default function RealTimeIntelligenceSection({
  data,
}: RealTimeIntelligenceSectionProps) {
  const { data: highlightsData, isLoading: highlightsLoading } =
    useDashboardHighlights({ category: "all" });

  const summaryStats = useMemo(() => {
    const totalSignals =
      data.total_posts ??
      data.feeds + data.forums + data.news + data.reports + data.social;

    const totalHighlights = Object.values(
      highlightsData?.category_counts ?? {},
    ).reduce((sum, count) => sum + count, 0);

    return [
      {
        label: "Señales",
        value: totalSignals,
        color: "text-[#E2E8F0]",
        loading: false,
      },
      {
        label: "Forums",
        value: data.forums,
        color: "text-[#C4B5FD]",
        loading: false,
      },
      {
        label: "Social",
        value: data.social,
        color: "text-[#FCD34D]",
        loading: false,
      },
      {
        label: "Highlights",
        value: totalHighlights,
        color: "text-[#7DD3FC]",
        loading: highlightsLoading,
      },
    ];
  }, [data, highlightsData, highlightsLoading]);

  return (
    <div
      className={cn(
        DASHBOARD_METRIC_CARD_CLASS,
        "flex h-full min-h-0 flex-col",
      )}
    >
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />

      <div className="relative z-10 mb-5 grid grid-cols-4 gap-2 pt-3">
        {summaryStats.map(({ label, value, color, loading }) => (
          <StatTile
            key={label}
            value={value}
            label={label}
            color={color}
            loading={loading}
          />
        ))}
      </div>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col">
          <RealTimeAlertsMonitor embedded data={data} />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <HighlightsPanel embedded />
        </div>
      </div>
    </div>
  );
}
