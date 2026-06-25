import {
  mockAnalyticsDeveloperSatisfaction,
  mockAnalyticsInsights,
  mockAnalyticsSummary,
  mockChatResponse,
  mockCompetitorsDashboard,
  mockDashboardHighlights,
  mockDbStatus,
  mockDeveloperSatisfactionByEngine,
  mockGlobalSentimentNps,
  mockHeaderLastUpdate,
  mockHeaderSourcesCount,
  mockKpisFull,
  mockLoginResponse,
  mockMarketPositioning,
  mockMarketShareTrend,
  mockMarketShareVsSatisfaction,
  mockMonitorizationCategories,
  mockMonitorizationPosts,
  mockNpsChurnFull,
  mockPerformanceGapApi,
  mockRealtimeFull,
  mockRevenueComparison,
  mockSatisfactionByDimension,
  mockStrategicInitiatives,
  mockTechnicalFriction,
  mockUsersList,
} from './mockData';

type MockHandler = (method: string, path: string, search: URLSearchParams, body?: string) => unknown;

function matchPath(path: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    return path.startsWith(pattern.slice(0, -1));
  }
  return path === pattern;
}

const routes: Array<{ pattern: string; method?: string; handler: MockHandler }> = [
  // Auth
  {
    pattern: '/api/v1/identity/auth/login',
    method: 'POST',
    handler: () => mockLoginResponse,
  },
  {
    pattern: '/api/v1/identity/auth/me',
    method: 'PATCH',
    handler: () => mockLoginResponse.user,
  },
  {
    pattern: '/api/v1/identity/password-recovery',
    method: 'POST',
    handler: () => undefined,
  },
  {
    pattern: '/api/v1/identity/users',
    handler: (_m, path) => {
      const idMatch = path.match(/^\/api\/v1\/identity\/users\/([^/]+)$/);
      if (idMatch) return mockLoginResponse.user;
      return mockUsersList;
    },
  },

  // Dashboard
  {
    pattern: '/api/v1/dashboard/kpis',
    handler: () => mockKpisFull,
  },
  {
    pattern: '/api/v1/dashboard/realtime-monitor',
    handler: () => mockRealtimeFull,
  },
  {
    pattern: '/api/v1/dashboard/nps-churn',
    handler: () => mockNpsChurnFull,
  },
  {
    pattern: '/api/v1/dashboard/developer-satisfaction',
    handler: (_m, _p, search) => {
      const engine = search.get('engine') ?? 'unity';
      return mockDeveloperSatisfactionByEngine[engine] ?? mockDeveloperSatisfactionByEngine.unity;
    },
  },
  {
    pattern: '/api/v1/dashboard/technical-friction',
    handler: () => mockTechnicalFriction,
  },
  {
    pattern: '/api/v1/dashboard/analytics-insights',
    handler: () => mockAnalyticsInsights,
  },
  {
    pattern: '/api/v1/dashboard/highlights',
    handler: () => mockDashboardHighlights,
  },

  // Monitorization
  {
    pattern: '/api/v1/monitorization/sources_count',
    handler: () => mockHeaderSourcesCount,
  },
  {
    pattern: '/api/v1/monitorization/last_update',
    handler: () => mockHeaderLastUpdate,
  },
  {
    pattern: '/api/v1/monitorization/db_status',
    handler: () => mockDbStatus,
  },
  {
    pattern: '/api/v1/monitorization/monitored_forums',
    handler: () => ({ count: 12 }),
  },
  {
    pattern: '/api/v1/monitorization/monitored_bugs',
    handler: () => ({ count: 34 }),
  },
  {
    pattern: '/api/v1/monitorization/count_posts',
    handler: () => ({ count: mockMonitorizationPosts.length }),
  },
  {
    pattern: '/api/v1/monitorization/posts/categories',
    handler: () => mockMonitorizationCategories,
  },
  {
    pattern: '/api/v1/monitorization/posts/sentiment/*',
    handler: (_m, _p, search) => {
      const limit = Number(search.get('limit') ?? 50);
      return mockMonitorizationPosts.slice(0, limit);
    },
  },
  {
    pattern: '/api/v1/monitorization/posts',
    handler: () => mockMonitorizationPosts,
  },
  {
    pattern: '/api/v1/monitorization/posts/*',
    handler: (method, path) => {
      const idMatch = path.match(/\/api\/v1\/monitorization\/posts\/(\d+)$/);
      if (idMatch) {
        const post = mockMonitorizationPosts.find((p) => p.id === idMatch[1]);
        return post ?? mockMonitorizationPosts[0];
      }
      if (method === 'GET' && path.startsWith('/api/v1/monitorization/posts')) {
        return mockMonitorizationPosts;
      }
      return mockMonitorizationPosts;
    },
  },

  // Analytics (ruta /api/analytics, sin /v1)
  {
    pattern: '/api/analytics/summary',
    handler: () => mockAnalyticsSummary,
  },
  {
    pattern: '/api/analytics/market-share-vs-satisfaction',
    handler: () => mockMarketShareVsSatisfaction,
  },
  {
    pattern: '/api/analytics/market-share-trend',
    handler: () => mockMarketShareTrend,
  },
  {
    pattern: '/api/analytics/developer-satisfaction',
    handler: () => mockAnalyticsDeveloperSatisfaction,
  },
  {
    pattern: '/api/analytics/satisfaction-by-dimension',
    handler: () => mockSatisfactionByDimension,
  },
  {
    pattern: '/api/analytics/performance-gap',
    handler: () => mockPerformanceGapApi,
  },
  {
    pattern: '/api/analytics/global-sentiment-nps',
    handler: () => mockGlobalSentimentNps,
  },

  // Competitors
  {
    pattern: '/api/v1/competitors/dashboard',
    handler: () => mockCompetitorsDashboard,
  },
  {
    pattern: '/api/v1/competitors/revenue',
    handler: () => mockRevenueComparison,
  },
  {
    pattern: '/api/v1/competitors/market-positioning',
    handler: () => mockMarketPositioning,
  },
  {
    pattern: '/api/v1/competitors/strategic-initiatives',
    handler: () => mockStrategicInitiatives,
  },

  // Chat
  {
    pattern: '/api/v1/chat/',
    method: 'POST',
    handler: () => mockChatResponse,
  },
  {
    pattern: '/api/v1/chat',
    method: 'POST',
    handler: () => mockChatResponse,
  },
];

function normalizeEndpoint(endpoint: string): { path: string; search: URLSearchParams } {
  const [rawPath, query] = endpoint.split('?');
  let path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  if (!path.startsWith('/api/')) {
    path = `/api/v1${path}`;
  }
  return { path, search: new URLSearchParams(query ?? '') };
}

export function resolveMockResponse(
  endpoint: string,
  method = 'GET',
  body?: string,
): unknown | undefined {
  const { path, search } = normalizeEndpoint(endpoint);
  const upperMethod = method.toUpperCase();

  for (const route of routes) {
    if (route.method && route.method !== upperMethod) continue;
    if (!matchPath(path, route.pattern)) continue;
    return route.handler(upperMethod, path, search, body);
  }

  console.warn('[offline] No mock for', upperMethod, path);
  return undefined;
}

export function hasMockFor(endpoint: string, method = 'GET'): boolean {
  return resolveMockResponse(endpoint, method) !== undefined;
}
