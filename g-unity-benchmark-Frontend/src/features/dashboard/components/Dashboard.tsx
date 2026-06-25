import { useMemo } from "react";
import OpportunityIndexCard from "./charts/OpportunityIndexCard";
import MarketShareChart from "./charts/MarketShareChart";
import RevenuePerEmployeeCard from "./charts/RevenuePerEmployeeCard";
import GlobalSentimentCard from "./charts/GlobalSentimentCard";
import DeveloperSatisfactionChart from "./charts/DeveloperSatisfactionChart";
import RealTimeIntelligenceSection from "./charts/RealTimeIntelligenceSection";
import TechnicalFrictionHeatmap from "./charts/TechnicalFrictionHeatmap";
import AnalyticsInsights from "./charts/AnalyticsInsights";
import ServiceDraftModal from "./ServiceDraftModal";

import { useDashboardData } from "../hooks/useDashboardData";
import { useAnalyticsInsights } from "../hooks/useAnalyticsInsights";
import { useTechnicalFriction } from "../hooks/useTechnicalFriction";
import { ApiErrorDisplay } from "../../../components/ui";

function DashboardSectionSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-[#1E293B]/60 bg-[#0F172A]/40 ${className}`}
      aria-hidden
    />
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, error } = useDashboardData();
  const {
    data: analyticsInsights = [],
    isLoading: insightsLoading,
    isError: insightsError,
    error: insightsFetchError,
  } = useAnalyticsInsights();

  const {
    data: technicalFrictionData,
    isLoading: frictionLoading,
    isError: frictionError,
    error: frictionFetchError,
  } = useTechnicalFriction();

  const frictionPayload = useMemo(
    () => ({
      categories:
        frictionError || !technicalFrictionData
          ? []
          : technicalFrictionData.categories,
    }),
    [frictionError, technicalFrictionData],
  );

  const insightsPayload = useMemo(
    () => ({ analyticsInsights: insightsError ? [] : analyticsInsights }),
    [insightsError, analyticsInsights],
  );

  if (isError && !data) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <ApiErrorDisplay error={error} title="Error al cargar" />
        </div>
      </div>
    );
  }

  const coreReady = !!data;
  const {
    opportunityIndex,
    marketShare,
    revenuePerEmployee,
    churnPredictor,
    npsComparison,
    adoptionIndex,
    developerSatisfaction,
    realTimeMonitoring,
  } = data ?? {
    opportunityIndex: null,
    marketShare: null,
    revenuePerEmployee: null,
    churnPredictor: null,
    npsComparison: null,
    adoptionIndex: null,
    developerSatisfaction: null,
    realTimeMonitoring: null,
  };

  return (
    <div className="relative m-10 *:full max-w-none bg-transparent text-white overflow-x-clip">
      <div className="relative z-10 flex w-full max-w-none flex-col">
        <main className="flex w-full max-w-none flex-1 flex-col gap-6 overflow-x-hidden px-[var(--layout-content-px)] py-[var(--layout-content-py)] md:gap-8">
          <header className="flex flex-col gap-2 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Executive Command Center
            </h1>
            <p className="text-sm text-unity-text-secondary">
              Unity Technologies competitive intelligence for Top Management
            </p>
          </header>

          {!coreReady ? (
            <div className="flex flex-col gap-6 md:gap-8">
              <DashboardSectionSkeleton className="h-40" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
                <DashboardSectionSkeleton className="h-56" />
                <DashboardSectionSkeleton className="h-56" />
                <DashboardSectionSkeleton className="h-56" />
              </div>
              <DashboardSectionSkeleton className="h-72" />
              {isLoading && (
                <p className="text-center text-sm text-unity-text-secondary animate-pulse">
                  Loading dashboard metrics…
                </p>
              )}
            </div>
          ) : (
            <>
              <section className="animate-fade-in-up w-full">
                <GlobalSentimentCard
                  nps={npsComparison!}
                  churn={churnPredictor!}
                />
              </section>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 md:items-stretch md:auto-rows-[minmax(0,1fr)]">
                <div className="animate-fade-in-up flex h-full min-h-0">
                  <OpportunityIndexCard
                    data={opportunityIndex!}
                    adoptionHistory={adoptionIndex!}
                  />
                </div>
                <div className="animate-fade-in-up flex h-full min-h-0">
                  <MarketShareChart data={marketShare!} />
                </div>
                <div className="animate-fade-in-up flex h-full min-h-0">
                  <RevenuePerEmployeeCard data={revenuePerEmployee!} />
                </div>
              </section>

              <section className="grid gap-6 md:gap-8 grid-cols-1 lg:grid-cols-2">
                <div className="animate-fade-in-up lg:col-span-2">
                  <DeveloperSatisfactionChart data={developerSatisfaction!} />
                </div>
              </section>
            </>
          )}

          <section className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2 lg:items-stretch">
            <div className="animate-fade-in-up flex h-full min-h-0">
              <TechnicalFrictionHeatmap
                data={frictionPayload}
                isLoading={frictionLoading}
                isError={frictionError}
                errorMessage={frictionFetchError?.message ?? null}
                isRealData={!frictionError && !!technicalFrictionData?.fromApi}
              />
            </div>
            <div className="animate-fade-in-up flex h-full min-h-0">
              <AnalyticsInsights
                data={insightsPayload}
                isLoading={insightsLoading}
                isError={insightsError}
                errorMessage={insightsFetchError?.message ?? null}
              />
            </div>
          </section>

          {coreReady && realTimeMonitoring && (
            <section className="grid gap-6 md:gap-8 grid-cols-1">
              <div className="animate-fade-in-up flex h-full min-h-0">
                <RealTimeIntelligenceSection data={realTimeMonitoring} />
              </div>
            </section>
          )}
        </main>
      </div>
      <ServiceDraftModal />
    </div>
  );
}
