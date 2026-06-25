import type { CompetitorMetricsSummary, EngineMetric } from '../hooks/useCompetitorsData';

interface Props {
  summary: CompetitorMetricsSummary;
  engines: EngineMetric[];
}

type Trend = 'up' | 'down' | 'neutral';

interface Metric {
  title: string;
  value: string;
  change: string;
  trend: Trend;
  bgColor: string;
  borderColor: string;
}

export function CompetitorMetricsGrid({ summary, engines }: Props) {
  const competitors  = engines.filter(e => e.platform.toLowerCase() !== 'unity');
  const unityEngine  = engines.find(e => e.platform.toLowerCase() === 'unity');

  const totalPosts   = summary.unity_post_count + summary.competitor_post_count;
  const churnRiskPct = totalPosts > 0 ? Math.round((summary.total_churn_risk / totalPosts) * 100) : 0;

  const avgCompetitorSentiment =
    competitors.length > 0
      ? competitors.reduce((sum, e) => sum + e.sentiment_score, 0) / competitors.length
      : 0;
  const unitySentiment    = unityEngine?.sentiment_score ?? 0;
  const sentimentDiff     = unitySentiment - avgCompetitorSentiment;
  const sentimentTrend: Trend =
    sentimentDiff > 2 ? 'up' : sentimentDiff < -2 ? 'down' : 'neutral';

  const metrics: Metric[] = [
    {
      title: 'Unity Posts Analizados',
      value: String(summary.unity_post_count),
      change: `NPS: ${summary.unity_nps}`,
      trend: summary.unity_nps > 0 ? 'up' : summary.unity_nps === 0 ? 'neutral' : 'down',
      bgColor: summary.unity_nps > 0 ? 'bg-orange-900/20' : 'bg-red-900/20',
      borderColor: summary.unity_nps > 0 ? 'border-orange-700' : 'border-red-700',
    },
    {
      title: 'Competidores Activos',
      value: String(competitors.length),
      change: `${summary.competitor_post_count} posts`,
      trend: 'neutral',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-700',
    },
    {
      title: 'Market Sentiment Balance',
      value: unityEngine
        ? `${sentimentDiff >= 0 ? '+' : ''}${sentimentDiff.toFixed(1)}%`
        : 'N/A',
      change: unityEngine
        ? `Unity: ${unitySentiment.toFixed(1)}% | Comp: ${avgCompetitorSentiment.toFixed(1)}%`
        : 'Sin datos',
      trend: sentimentTrend,
      bgColor: sentimentTrend === 'up' ? 'bg-green-900/20' : sentimentTrend === 'neutral' ? 'bg-yellow-900/20' : 'bg-red-900/20',
      borderColor: sentimentTrend === 'up' ? 'border-green-700' : sentimentTrend === 'neutral' ? 'border-yellow-700' : 'border-red-700',
    },
    {
      title: 'Competitive Health Index',
      value: `${summary.unity_nps} pts`,
      change: summary.unity_nps > 0 ? 'Strong' : summary.unity_nps === 0 ? 'Stable' : 'Declining',
      trend: summary.unity_nps > 0 ? 'up' : summary.unity_nps === 0 ? 'neutral' : 'down',
      bgColor: summary.unity_nps > 0 ? 'bg-green-900/20' : 'bg-red-900/20',
      borderColor: summary.unity_nps > 0 ? 'border-green-700' : 'border-red-700',
    },
    {
      title: 'High Priority Risks',
      value: String(summary.critical_alerts),
      change: summary.critical_alerts === 0 ? 'All clear' : summary.critical_alerts > 50 ? 'Action required' : 'Monitor closely',
      trend: summary.critical_alerts === 0 ? 'up' : 'down',
      bgColor: summary.critical_alerts === 0 ? 'bg-green-900/20' : 'bg-red-900/20',
      borderColor: summary.critical_alerts === 0 ? 'border-green-700' : 'border-red-700',
    },
    {
      title: 'Churn Risk Exposure',
      value: `${churnRiskPct}%`,
      change: `${summary.total_churn_risk} posts at risk`,
      trend: churnRiskPct > 40 ? 'down' : churnRiskPct > 20 ? 'neutral' : 'up',
      bgColor: churnRiskPct > 40 ? 'bg-red-900/20' : 'bg-yellow-900/20',
      borderColor: churnRiskPct > 40 ? 'border-red-700' : 'border-yellow-700',
    },
  ];

  const trendIcon  = (t: Trend) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
  const trendColor = (t: Trend) => t === 'up' ? 'text-green-400' : t === 'down' ? 'text-red-400' : 'text-yellow-400';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`${metric.bgColor} rounded-lg border ${metric.borderColor} p-4`}
        >
          <div className="text-2xl font-bold text-white mb-1">
            {metric.value}
          </div>
          <div className="text-xs text-gray-400 mb-2">
            {metric.title}
          </div>
          <div className={`text-sm font-semibold ${trendColor(metric.trend)}`}>
            {trendIcon(metric.trend)} {metric.change}
          </div>
        </div>
      ))}
    </div>
  );
}