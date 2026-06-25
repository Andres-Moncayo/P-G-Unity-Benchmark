import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMessage } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../../../utils/cn";
import {
  DASHBOARD_METRIC_CARD_CLASS,
  DASHBOARD_METRIC_CARD_OVERLAY_CLASS,
} from "./DashboardViewToggle";

const BRAND_COLORS = {
  unity: "#7DD3FC",
  godot: "#6EE7B7",
  unreal: "#C4B5FD",
} as const;

interface GlobalSentimentCardProps {
  nps: { unity: number; godot: number; industry: number };
  churn: { risk: string; probability: number };
  className?: string;
}

const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case "high":
      return "text-[#FCA5A5]";
    case "medium":
      return "text-[#FCD34D]";
    case "low":
      return "text-[#6EE7B7]";
    default:
      return "text-[#94A3B8]";
  }
};

const getRiskBarColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case "high":
      return "bg-[#FCA5A5] shadow-sm shadow-[#FCA5A5]/50";
    case "medium":
      return "bg-[#FCD34D] shadow-sm shadow-[#FCD34D]/50";
    case "low":
      return "bg-[#6EE7B7] shadow-sm shadow-[#6EE7B7]/50";
    default:
      return "bg-[#7DD3FC] shadow-sm shadow-[#7DD3FC]/50";
  }
};

export default function GlobalSentimentCard({
  nps,
  churn,
  className = "",
}: GlobalSentimentCardProps) {
  const npsMetrics = [
    { label: "Unity", value: nps.unity, color: BRAND_COLORS.unity },
    { label: "Godot", value: nps.godot, color: BRAND_COLORS.godot },
    { label: "Unreal", value: nps.industry, color: BRAND_COLORS.unreal },
  ] as const;

  return (
    <div className={cn(DASHBOARD_METRIC_CARD_CLASS, className)}>
      <div className={DASHBOARD_METRIC_CARD_OVERLAY_CLASS} />
      <div className="relative z-10 flex w-full flex-col items-center gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-10 md:px-8 lg:px-10">
        <div className="mx-[60px] flex w-fit flex-wrap items-center gap-5 text-left sm:gap-6 md:gap-8 lg:gap-10">
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="rounded-md bg-[#7DD3FC]/10 p-1 shadow-sm shadow-[#7DD3FC]/15">
              <FontAwesomeIcon
                icon={faMessage}
                className="h-2.5 w-2.5 text-[#7DD3FC]"
              />
            </div>
            <span className="text-xs font-medium text-[#94A3B8]">NPS</span>
          </div>

          <div className="flex items-center gap-7 sm:gap-9 lg:gap-12">
            {npsMetrics.map(({ label, value, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 shrink-0 rounded-full shadow-sm"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 4px ${color}80`,
                  }}
                />
                <span className="text-xs text-[#64748B]">{label}</span>
                <span
                  className="text-sm font-bold leading-none"
                  style={{ color }}
                >
                  {value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-fit items-center gap-4 sm:gap-5 md:gap-6">
          <span className="shrink-0 whitespace-nowrap text-xs font-medium text-[#94A3B8]">
            Churn Predictor
          </span>

          <div className="flex w-44 items-center gap-3 sm:w-48 md:w-52">
            <span
              className={cn(
                "w-10 shrink-0 text-xs font-semibold capitalize sm:w-12",
                getRiskColor(churn.risk),
              )}
            >
              {churn.risk}
            </span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#1E293B]">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  getRiskBarColor(churn.risk),
                )}
                style={{ width: `${churn.probability * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
