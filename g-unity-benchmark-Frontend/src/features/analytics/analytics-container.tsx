import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AnalyticsDatabaseBanner } from './components/AnalyticsDatabaseBanner';
import { useAnalyticsDbUnavailable } from './hooks/useAnalyticsDbUnavailable';
import { DeveloperSatisfactionChart } from './components/DeveloperSatisfactionChart';
import { MarketShareTrend } from './components/MarketShareTrend';
import { MarketShareSatisfactionScatter } from './components/MarketShareSatisfactionScatter';
import { SatisfactionByDimensionChart } from './components/SatisfactionByDimensionChart';
import { PerformanceGapChart } from './components/PerformanceGapChart';
import { GlobalSentimentNPSChart } from './components/GlobalSentimentNPSChart';

export function AnalyticsContainer() {
  const { isDbUnavailable, message } = useAnalyticsDbUnavailable();

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-3 md:py-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          Competitive intelligence KPIs and market benchmarks.
        </p>
      </header>

      {isDbUnavailable && message ? <AnalyticsDatabaseBanner message={message} /> : null}

      <AnalyticsDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 analytics-charts">
        <MarketShareTrend />
        <DeveloperSatisfactionChart />
        <MarketShareSatisfactionScatter />
        <SatisfactionByDimensionChart />
        <PerformanceGapChart />
        <GlobalSentimentNPSChart />
      </div>
    </div>
  );
}

