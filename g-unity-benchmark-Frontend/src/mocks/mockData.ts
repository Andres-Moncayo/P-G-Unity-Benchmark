import { mockDashboardData } from '../features/dashboard/hooks/useMockChat';
import {
  mockKpisResponse,
  mockRealtimeResponse,
  mockSatGodot,
  mockSatUnity,
  mockSatUnreal,
} from '../tests/mocks/dashboardFixtures';
import type { MonitorizationPost } from '../features/monitorization/types';

// ─── Auth ───────────────────────────────────────────────────────────────────

export const mockLoginResponse = {
  access_token: 'offline-demo-token',
  refresh_token: 'offline-demo-refresh',
  token_type: 'bearer',
  user: {
    id: 'offline-demo-user',
    email: 'demo@unity.local',
    full_name: 'Usuario Demo',
    is_active: true,
    role: { id: 1, name: 'Admin', slug: 'admin', description: 'Demo admin' },
  },
};

export const mockUsersList = [mockLoginResponse.user];

// ─── Dashboard KPIs (expandido desde fixtures) ──────────────────────────────

export const mockKpisFull = {
  ...mockKpisResponse,
  meta: { previous_quarter: 'Q4 2024' },
  opportunity_index: {
    value: mockDashboardData.opportunityIndex.score,
    quarter_over_quarter_pct: 8,
    history: mockDashboardData.adoptionIndex.unity.map((u, i) => ({
      month: u.month,
      unity: u.value,
      unreal: mockDashboardData.adoptionIndex.unreal[i]?.value ?? 0,
      godot: mockDashboardData.adoptionIndex.godot[i]?.value ?? 0,
    })),
  },
  market_share_shift: {
    share_of_voice: {
      unity_share: mockDashboardData.marketShare.unity / 100,
      competitor_share: mockDashboardData.marketShare.unreal / 100,
    },
    history: mockDashboardData.marketShare.history,
  },
  revenue_per_employee: {
    value: 371,
    quarter_over_quarter_pct: -12.3,
    competitors: mockDashboardData.revenuePerEmployee.competitors,
    history: mockDashboardData.revenuePerEmployee.history,
  },
};

export const mockRealtimeFull = {
  ...mockRealtimeResponse,
  feeds: mockDashboardData.realTimeMonitoring.feeds,
  forums: mockDashboardData.realTimeMonitoring.forums,
  news: mockDashboardData.realTimeMonitoring.news,
  reports: mockDashboardData.realTimeMonitoring.reports,
  social: mockDashboardData.realTimeMonitoring.social,
  alerts: mockDashboardData.realTimeMonitoring.alerts,
  alerts_total: mockDashboardData.realTimeMonitoring.alerts.length,
  active_filter: 'Todos',
  available_filters: ['Todos', 'Producto', 'Finanzas', 'Posicionamiento'],
};

export const mockNpsChurnFull = {
  nps: {
    unity: mockDashboardData.npsComparison.unity,
    godot: mockDashboardData.npsComparison.godot,
    unreal: mockDashboardData.npsComparison.unreal,
    industry: mockDashboardData.npsComparison.industry,
  },
  churn: {
    risk: mockDashboardData.churnPredictor.risk.toLowerCase(),
    probability: mockDashboardData.churnPredictor.probability,
  },
};

export const mockTechnicalFriction = {
  categories: mockDashboardData.technicalFriction.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    severity: cat.severity,
    activeIssues: cat.activeIssues,
    affectedDevices: cat.affectedDevices,
    avgResolutionTime: cat.avgResolutionTime,
    issues: cat.issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      severity: issue.severity,
      errorCode: `ERR-${issue.id}`,
      status: 'open',
      devices: issue.devices,
      trend: issue.trend,
      firstSeen: issue.firstSeen,
      description: issue.description,
    })),
  })),
  meta: { data_source: 'demo' },
};

export const mockAnalyticsInsights = {
  meta: { source: 'demo' },
  insights: mockDashboardData.analyticsInsights,
};

export const mockDashboardHighlights = {
  active_filter: 'all',
  available_filters: ['all', 'ai', 'robotic', 'digital_twins'],
  category_counts: { all: 12, ai: 4, robotic: 3, digital_twins: 5 },
  highlights: [
    {
      id: 1,
      title: 'Unity 6.1 mejora rendimiento mobile',
      content: 'DX12/URP reduce build times en dispositivos móviles un 30%.',
      game_engine: 'unity',
      category: 'ai',
    },
    {
      id: 2,
      title: 'Adopción Unreal Engine 5.5 +23% YoY',
      content: 'Epic Games reporta crecimiento en estudios indie.',
      game_engine: 'unreal',
      category: 'robotic',
    },
  ],
  post_highlights: [
    {
      id: 101,
      title: 'Godot superó a Unity en adopción indie post-Runtime Fee',
      summary: 'Migración acelerada en segmento educacional.',
      url: 'https://example.com/godot-migration',
      date: '2025-01-03',
      game_engine: 'godot',
      category: 'digital_twins',
    },
  ],
};

// ─── Header / Monitorization ────────────────────────────────────────────────

export const mockHeaderSourcesCount = { count: mockDashboardData.executiveDashboard.sources };
export const mockHeaderLastUpdate = { last_update: new Date().toISOString() };
export const mockDbStatus = { connected: false };

function buildMonitorizationPost(id: number, overrides: Partial<MonitorizationPost> = {}): MonitorizationPost {
  return {
    id: String(id),
    title: overrides.title ?? `Post de monitorización #${id}`,
    summary: overrides.summary ?? 'Análisis de sentimiento sobre motores de juego.',
    url: overrides.url ?? `https://example.com/post/${id}`,
    date: overrides.date ?? new Date().toISOString(),
    source: {
      platform: 'reddit',
      subreddit: 'gamedev',
      author: 'dev_user',
      engagement: { upvotes: 120, comments: 34, shares: 5 },
    },
    sentiment: { score: -0.3, label: 'negative', confidence: 0.87 },
    platform_mentioned: 'unity',
    bug: null,
    technical_analysis: {
      bug_category: 'rendering',
      severity: 'high',
      unity_version: '6.1',
      affected_platforms: ['Android', 'iOS'],
    },
    business_metrics: {
      churn_risk: 'medium',
      churn_probability: 0.35,
      revenue_impact: 'medium',
      user_segment: 'indie',
    },
    competitive_intelligence: {
      competitor_mentioned: 'godot',
      comparison_type: 'cost',
      migration_intent: 'considering',
    },
    nps_indicators: {
      sentiment_strength: -1,
      would_recommend: false,
      key_factors: ['pricing', 'runtime fee'],
    },
    market_signals: {
      industry_trend: 'growing',
      adoption_stage: 'evaluation',
      company_size: '1-10',
      geographic_region: 'na',
    },
    alert_metadata: {
      type: 'competitive',
      urgency: 'high',
      reach: 4200,
      influence_score: 0.72,
    },
    business_category: 'product',
    ...overrides,
  };
}

export const mockMonitorizationPosts: MonitorizationPost[] = [
  buildMonitorizationPost(1, {
    title: 'Unity pricing backlash grows on Reddit',
    sentiment: { score: -0.6, label: 'negative', confidence: 0.92 },
  }),
  buildMonitorizationPost(2, {
    title: 'Unreal Engine 5.5 adoption surges in indie studios',
    platform_mentioned: 'unreal',
    sentiment: { score: 0.5, label: 'positive', confidence: 0.88 },
  }),
  buildMonitorizationPost(3, {
    title: 'Godot 4.3 documentation praised by community',
    platform_mentioned: 'godot',
    sentiment: { score: 0.7, label: 'positive', confidence: 0.95 },
  }),
];

export const mockMonitorizationCategories = [
  { category: 'product', posts: mockMonitorizationPosts.slice(0, 2) },
  { category: 'competitive', posts: mockMonitorizationPosts.slice(2) },
];

// ─── Analytics ────────────────────────────────────────────────────────────────

export const mockAnalyticsSummary = [
  { label: 'Market Share Unity', value: '29.5%', change: '-5.7%', trend: 'negative' as const, formula: 'Share of voice Q4 2024' },
  { label: 'NPS Unity', value: '31', change: '-18 pts', trend: 'negative' as const, formula: 'Promoters - Detractors' },
  { label: 'Churn Risk', value: 'Medium', change: '+12%', trend: 'negative' as const, formula: 'ML predictor v2' },
  { label: 'Dev Satisfaction', value: '6.8/10', change: '+0.3', trend: 'positive' as const, formula: 'Survey weighted avg' },
];

export const mockMarketShareVsSatisfaction = [
  { segment: 'Unity' as const, label: 'Unity', share: 29.5, satisfaction: 6.8, benchmark: 7.5 },
  { segment: 'Unreal' as const, label: 'Unreal', share: 38.2, satisfaction: 8.1, benchmark: 7.5 },
  { segment: 'Godot' as const, label: 'Godot', share: 13.8, satisfaction: 8.9, benchmark: 7.5 },
  { segment: 'Other' as const, label: 'Other', share: 18.5, satisfaction: 6.2, benchmark: 7.5 },
];

export const mockMarketShareTrend = [
  { period: 'Q1 24', unity: 30.8, unreal: 37.8, godot: 13.5, other: 17.9 },
  { period: 'Q2 24', unity: 30.2, unreal: 38.0, godot: 13.6, other: 18.2 },
  { period: 'Q3 24', unity: 29.8, unreal: 38.1, godot: 13.7, other: 18.4 },
  { period: 'Q4 24', unity: 29.5, unreal: 38.2, godot: 13.8, other: 18.5 },
];

export const mockAnalyticsDeveloperSatisfaction = [
  { year: '2022', unity: 7.2, unreal: 7.8, godot: 8.1 },
  { year: '2023', unity: 6.9, unreal: 8.0, godot: 8.5 },
  { year: '2024', unity: 6.8, unreal: 8.1, godot: 8.9 },
];

export const mockSatisfactionByDimension = [
  { dimension: 'Ease of Use', unity: 7.2, unreal: 5.8, godot: 8.9, benchmark: 7.5 },
  { dimension: 'Performance', unity: 6.5, unreal: 9.1, godot: 7.4, benchmark: 7.5 },
  { dimension: 'Documentation', unity: 7.8, unreal: 8.2, godot: 8.5, benchmark: 7.5 },
  { dimension: 'Community', unity: 8.5, unreal: 7.9, godot: 9.2, benchmark: 7.5 },
  { dimension: 'Price/Value', unity: 4.2, unreal: 8.8, godot: 9.5, benchmark: 7.5 },
  { dimension: 'Technical Support', unity: 6.1, unreal: 7.4, godot: 7.7, benchmark: 7.5 },
];

export const mockPerformanceGapApi = [
  { metric: 'Iteration Time (s)', unity: 12.4, unreal: 18.2, godot: 8.1 },
  { metric: 'Build Size (MB)', unity: 245, unreal: 380, godot: 95 },
];

export const mockGlobalSentimentNps = {
  benchmark_nps: 45,
  unity_below_benchmark: true,
  platforms: [
    { platform: 'Reddit', nps: 28, sentiment_positive: 32, sentiment_neutral: 28, sentiment_negative: 40 },
    { platform: 'Twitter', nps: 22, sentiment_positive: 25, sentiment_neutral: 30, sentiment_negative: 45 },
    { platform: 'Forums', nps: 35, sentiment_positive: 38, sentiment_neutral: 32, sentiment_negative: 30 },
  ],
};

// ─── Competitors ────────────────────────────────────────────────────────────

export const mockCompetitorsDashboard = {
  summary: {
    unity_post_count: 1240,
    unity_nps: 31,
    competitor_post_count: 2180,
    critical_alerts: 7,
    high_alerts: 23,
    total_churn_risk: 156,
  },
  engines: [
    {
      engine: 'Unity', platform: 'Mobile', post_count: 520, positive_count: 180, negative_count: 240,
      neutral_count: 100, promotor_total: 120, detractor_total: 200, churn_risk_count: 45,
      high_alerts: 8, medium_alerts: 15, low_alerts: 22, nps_score: 31, sentiment_score: -0.15,
    },
    {
      engine: 'Unreal', platform: 'PC/Console', post_count: 890, positive_count: 520, negative_count: 180,
      neutral_count: 190, promotor_total: 480, detractor_total: 120, churn_risk_count: 28,
      high_alerts: 4, medium_alerts: 10, low_alerts: 14, nps_score: 72, sentiment_score: 0.42,
    },
    {
      engine: 'Godot', platform: 'Indie', post_count: 650, positive_count: 480, negative_count: 60,
      neutral_count: 110, promotor_total: 420, detractor_total: 40, churn_risk_count: 12,
      high_alerts: 2, medium_alerts: 5, low_alerts: 5, nps_score: 89, sentiment_score: 0.68,
    },
  ],
  pulse: [
    { platform: 'Reddit', post_count: 420, positive_pct: 32, negative_pct: 45, churn_risk_pct: 18, nps: 28 },
    { platform: 'Twitter', post_count: 380, positive_pct: 28, negative_pct: 48, churn_risk_pct: 22, nps: 22 },
    { platform: 'Forums', post_count: 290, positive_pct: 42, negative_pct: 35, churn_risk_pct: 12, nps: 38 },
  ],
  critical_alerts: [
    {
      id: 1, title: 'Runtime fee backlash intensifies', summary: 'Community sentiment declining rapidly.',
      platform: 'reddit', alert_type: 'competitive', sentimental: 'negative', churn_risk: 'high',
      url: 'https://example.com/alert/1', date_post: '2025-01-03T10:00:00Z',
    },
    {
      id: 2, title: 'Godot adoption surge in education', summary: 'Universities migrating from Unity.',
      platform: 'forums', alert_type: 'competitive', sentimental: 'negative', churn_risk: 'medium',
      url: 'https://example.com/alert/2', date_post: '2025-01-02T15:30:00Z',
    },
  ],
  recent_posts: [
    {
      id: 10, title: 'Unity 6.1 mobile rendering improvements', summary: 'Positive reception on r/gamedev.',
      platform: 'reddit', sentimental: 'positive', alert_type: 'product', bug: null, performance: 'improved',
      url: 'https://example.com/post/10', date_post: '2025-01-03T14:00:00Z',
    },
  ],
};

export const mockRevenueComparison = {
  quarters: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24'],
  data_points: [
    { quarter: 'Q4 24', company: 'Unity', platform: 'All', revenue_usd_millions: 420, source_type: 'estimate' },
    { quarter: 'Q4 24', company: 'Epic', platform: 'Unreal', revenue_usd_millions: 890, source_type: 'estimate' },
    { quarter: 'Q4 24', company: 'Godot Foundation', platform: 'Godot', revenue_usd_millions: 12, source_type: 'estimate' },
    { quarter: 'Q3 24', company: 'Unity', platform: 'All', revenue_usd_millions: 435, source_type: 'estimate' },
    { quarter: 'Q3 24', company: 'Epic', platform: 'Unreal', revenue_usd_millions: 870, source_type: 'estimate' },
  ],
};

export const mockMarketPositioning = [
  { id: 1, engine: 'Unity', platform: 'Mobile', user_segment: 'Indie', strength: 72, trend: 'down', recorded_at: '2025-01-01' },
  { id: 2, engine: 'Unreal', platform: 'PC', user_segment: 'AAA', strength: 91, trend: 'up', recorded_at: '2025-01-01' },
  { id: 3, engine: 'Godot', platform: 'Cross', user_segment: 'Indie', strength: 85, trend: 'up', recorded_at: '2025-01-01' },
];

export const mockStrategicInitiatives = [
  {
    id: 1, company: 'Epic Games', platform: 'Unreal', initiative: 'Royalty threshold reduction',
    description: 'Reduced royalty threshold to $500K.', impact: 'high', timeline: 'Q4 2024',
    status: 'active', source_url: 'https://example.com/epic', created_at: '2024-10-01', updated_at: '2024-12-01',
  },
  {
    id: 2, company: 'Godot Foundation', platform: 'Godot', initiative: 'Education program expansion',
    description: 'Free licenses for universities worldwide.', impact: 'medium', timeline: 'Q1 2025',
    status: 'planned', source_url: 'https://example.com/godot', created_at: '2024-11-15', updated_at: '2024-12-20',
  },
];

// ─── Chat ───────────────────────────────────────────────────────────────────

export const mockChatResponse = {
  conversation_id: 'offline-conv-1',
  answer: 'En modo demo, esta respuesta usa datos de ejemplo. Unity mantiene un 29.5% de market share con NPS de 31 puntos, por debajo del benchmark de la industria (45). Godot muestra la mayor satisfacción de desarrolladores (8.9/10).',
  title: 'Análisis competitivo demo',
  insights: [
    'Unity perdió 5.7pp de market share en 12 meses',
    'Godot ganó 89K+ nuevos desarrolladores en Q4 2024',
    'El NPS de Unity cayó de 49 a 31 en 6 meses',
  ],
  recommendations: [
    'Revisar estructura de runtime fee para segmento indie',
    'Acelerar roadmap de rendering mobile DX12/URP',
    'Desarrollar oferta competitiva Unity Lite',
  ],
  sources: [
    { title: 'GDC Survey 2024', url: 'https://example.com/gdc' },
    { title: 'Reddit r/gamedev sentiment', url: 'https://example.com/reddit' },
  ],
  visual_data: {
    chart_type: 'bar',
    title: 'Market Share Q4 2024',
    labels: ['Unity', 'Unreal', 'Godot', 'Other'],
    values: [29.5, 38.2, 13.8, 18.5],
    unit: '%',
  },
  confidence: 0.85,
};

// Re-export developer satisfaction per engine
export const mockDeveloperSatisfactionByEngine: Record<string, typeof mockSatUnity> = {
  unity: mockSatUnity,
  unreal: mockSatUnreal,
  godot: mockSatGodot,
};
