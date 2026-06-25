// ─── Fixtures de respuestas mock del backend ───

export const mockKpisResponse = {
  meta: { previous_quarter: 'Q1 2026' },
  opportunity_index: {
    value: 72,
    quarter_over_quarter_pct: 5.2,
    history: [
      { month: 'Ene', unity: 80, unreal: 75, godot: 60 },
      { month: 'Feb', unity: 82, unreal: 74, godot: 62 },
    ],
  },
  market_share_shift: {
    share_of_voice: { unity_share: 0.45, competitor_share: 0.35 },
    history: [],
  },
  revenue_per_employee: {
    value: 520,
    quarter_over_quarter_pct: -2.1,
    competitors: [],
    history: [],
  },
};

export const mockKpisNegativeTrend = {
  meta: { previous_quarter: 'Q1 2026' },
  opportunity_index: {
    value: 60,
    quarter_over_quarter_pct: -3.5,
    history: [],
  },
  market_share_shift: {
    share_of_voice: { unity_share: 0.40, competitor_share: 0.30 },
    history: [],
  },
  revenue_per_employee: {
    value: 400,
    quarter_over_quarter_pct: -2.1,
    competitors: [],
    history: [],
  },
};

export const mockRealtimeResponse = {
  feeds: 1240,
  forums: 380,
  news: 92,
  reports: 14,
  social: 870,
  alerts: [
    {
      id: 1,
      source: 'Reddit',
      time: '2h ago',
      category: 'Producto',
      sentiment: 'negative',
      title: 'Unity pricing backlash grows',
      tags: ['pricing', 'unity'],
      live: true,
    },
  ],
};

export const mockNpsChurnResponse = {
  nps: { unity: 42, godot: 68, unreal: 55, industry: 50 },
  churn: { risk: 'medium', probability: 0.38 },
};

export const mockSatUnity = {
  scores: {
    technical_support: 72,
    ease_of_use: 68,
    performance: 80,
    documentation: 60,
    community: 75,
    price_value: 55,
  },
};

export const mockSatUnreal = {
  scores: {
    technical_support: 78,
    ease_of_use: 70,
    performance: 85,
    documentation: 72,
    community: 80,
    price_value: 60,
  },
};

export const mockSatGodot = {
  scores: {
    technical_support: 65,
    ease_of_use: 82,
    performance: 70,
    documentation: 88,
    community: 90,
    price_value: 95,
  },
};

// Dashboard data completo para tests de componentes
export const mockDashboardData = {
  opportunityIndex: {
    score: 72,
    trend: 'up' as const,
    change: '+5.2%',
    previousQuarter: 'Q1 2026',
    opportunities: [],
  },
  marketShare: {
    unity: 45,
    unreal: 35,
    godot: 0,
    gamemaker: 0,
    cryengine: 0,
    o3de: 0,
    history: [],
  },
  revenuePerEmployee: {
    current: '$520K',
    benchmark: '$0K',
    delta: '-2.1%',
    trend: 'down' as const,
    competitors: [],
    history: [],
  },
  churnPredictor: { risk: 'medium', probability: 0.38, triggers: [] },
  npsComparison: { unity: 42, godot: 68, unreal: 55, industry: 50 },
  adoptionIndex: { base: 100, unity: [], unreal: [], godot: [] },
  developerSatisfaction: { dimensions: [] },
  realTimeMonitoring: {
    feeds: 1240,
    forums: 380,
    news: 92,
    reports: 14,
    social: 870,
    alerts: [],
  },
  strategicAlerts: [],
  executiveDashboard: {
    liveData: false,
    sources: 0,
    lastUpdate: '',
    marketShare: 0,
    change: '',
    criticalAlerts: 0,
    pulseCompetitive: [],
  },
  execSummary: [],
  technicalFriction: { categories: [] },
  liveMonitoringFeed: { sources: [], feeds: [] },
  analyticsInsights: [],
};
