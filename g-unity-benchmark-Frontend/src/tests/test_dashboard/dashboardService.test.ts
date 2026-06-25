import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardData } from '../../features/dashboard/services/dashboardService';
import * as apiModule from '../../services/apiClient';
import {
  mockKpisResponse,
  mockKpisNegativeTrend,
  mockRealtimeResponse,
  mockNpsChurnResponse,
  mockSatUnity,
  mockSatUnreal,
  mockSatGodot,
} from '../mocks/dashboardFixtures';

// Mock del módulo apiClient
vi.mock('../../services/apiClient', () => ({
  apiClient: vi.fn(),
  API_BASE_URL: '',
  ApiError: class ApiError extends Error {
    constructor(public status: number, public detail: unknown, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

// Mock del store para que apiClient pueda funcionar sin Zustand
vi.mock('../../store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ token: null, logout: vi.fn() }),
  },
}));

const mockedApiClient = vi.mocked(apiModule.apiClient);

// Helper para mockear las 6 llamadas en orden del Promise.all
function mockAllApiCalls(
  kpis = mockKpisResponse,
  realtime: unknown = mockRealtimeResponse,
  npsChurn: unknown = mockNpsChurnResponse,
  satUnity: unknown = mockSatUnity,
  satUnreal: unknown = mockSatUnreal,
  satGodot: unknown = mockSatGodot
) {
  mockedApiClient
    .mockResolvedValueOnce(kpis)       // /dashboard/kpis
    .mockResolvedValueOnce(realtime)    // /dashboard/realtime-monitor
    .mockResolvedValueOnce(npsChurn)    // /dashboard/nps-churn
    .mockResolvedValueOnce(satUnity)    // /dashboard/developer-satisfaction?engine=unity
    .mockResolvedValueOnce(satUnreal)   // /dashboard/developer-satisfaction?engine=unreal
    .mockResolvedValueOnce(satGodot);   // /dashboard/developer-satisfaction?engine=godot
}

describe('TestDashboardService — getDashboardData()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test 1 ───
  it('Test 1: mapea opportunity_index correctamente desde /dashboard/kpis', async () => {
    mockAllApiCalls();
    const result = await getDashboardData();

    expect(result.opportunityIndex.score).toBe(72);
    expect(result.opportunityIndex.trend).toBe('up');
    expect(result.opportunityIndex.change).toBe('+5.2%');
    expect(result.opportunityIndex.previousQuarter).toBe('Q1 2026');
  });

  // ─── Test 2 ───
  it('Test 2: establece trend "down" y change negativo cuando pct es negativo', async () => {
    mockAllApiCalls(mockKpisNegativeTrend);
    const result = await getDashboardData();

    expect(result.opportunityIndex.trend).toBe('down');
    expect(result.opportunityIndex.change).toBe('-3.5%');
    expect(result.opportunityIndex.score).toBe(60);
  });

  // ─── Test 3 ───
  it('Test 3: mapea market_share con redondeo correcto a 1 decimal', async () => {
    mockAllApiCalls();
    const result = await getDashboardData();

    // unity_share: 0.45 → 45.0
    expect(result.marketShare.unity).toBe(45);
    // competitor_share: 0.35 → 35.0
    expect(result.marketShare.unreal).toBe(35);
  });

  // ─── Test 4 ───
  it('Test 4: mapea revenue_per_employee a formato $NNNk con trend', async () => {
    mockAllApiCalls();
    const result = await getDashboardData();

    expect(result.revenuePerEmployee.current).toBe('$520K');
    expect(result.revenuePerEmployee.trend).toBe('down');
    expect(result.revenuePerEmployee.delta).toBe('-2.1%');
  });

  // ─── Test 5 ───
  it('Test 5: retorna estructura con valores en 0 cuando kpis es null', async () => {
    mockAllApiCalls(null as any);
    const result = await getDashboardData();

    expect(result.opportunityIndex.score).toBe(0);
    expect(result.marketShare.unity).toBe(0);
    expect(result.revenuePerEmployee.current).toBe('$0K');
  });

  // ─── Test 6 ───
  it('Test 6: emite console.warn cuando el schema Zod de realtime falla y mantiene feeds en 0', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockAllApiCalls(mockKpisResponse, { datosMalformados: true });
    const result = await getDashboardData();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Zod validation failed for RealTime Monitor:'),
      expect.anything()
    );
    expect(result.realTimeMonitoring.feeds).toBe(0);
    expect(result.realTimeMonitoring.alerts).toEqual([]);
    warnSpy.mockRestore();
  });

  // ─── Test 7 ───
  it('Test 7: mapea NPS comparison y churn predictor desde /dashboard/nps-churn', async () => {
    mockAllApiCalls();
    const result = await getDashboardData();

    expect(result.npsComparison.unity).toBe(42);
    expect(result.npsComparison.godot).toBe(68);
    expect(result.npsComparison.unreal).toBe(55);
    expect(result.churnPredictor.risk).toBe('medium');
    expect(result.churnPredictor.probability).toBe(0.38);
  });

  // ─── Test 8 ───
  it('Test 8: mapea developer satisfaction por dimensión para los 3 motores', async () => {
    mockAllApiCalls();
    const result = await getDashboardData();

    const dimensions = result.developerSatisfaction.dimensions;
    expect(dimensions).toHaveLength(6);

    const techSupport = dimensions.find((d) => d.name === 'Technical Support');
    expect(techSupport?.unity).toBe(72);
    expect(techSupport?.unreal).toBe(78);
    expect(techSupport?.godot).toBe(65);

    const performance = dimensions.find((d) => d.name === 'Performance');
    expect(performance?.unity).toBe(80);
  });
});
