import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAnalyticsInsights } from '../../features/dashboard/services/analyticsInsights';
import * as apiModule from '../../services/apiClient';

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

vi.mock('../../store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ token: null, logout: vi.fn() }),
  },
}));

const mockedApiClient = vi.mocked(apiModule.apiClient);

describe('TestAnalyticsInsightsService — fetchAnalyticsInsights()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test 9 ───
  it('Test 9: llama al endpoint correcto con parámetro limit en el query string', async () => {
    mockedApiClient.mockResolvedValueOnce({ meta: {}, insights: [] });

    await fetchAnalyticsInsights({ limit: 10 });

    expect(mockedApiClient).toHaveBeenCalledWith(
      expect.stringContaining('limit=10')
    );
  });

  // ─── Test 10 ───
  it('Test 10: construye URL con limit, severity y category juntos', async () => {
    mockedApiClient.mockResolvedValueOnce({ meta: {}, insights: [] });

    await fetchAnalyticsInsights({ limit: 5, severity: 'critical', category: 'Producto' });

    const calledPath = mockedApiClient.mock.calls[0][0] as string;
    expect(calledPath).toContain('limit=5');
    expect(calledPath).toContain('severity=critical');
    expect(calledPath).toContain('category=Producto');
  });

  // ─── Test 11 ───
  it('Test 11: retorna [] si la respuesta del backend no tiene campo insights', async () => {
    mockedApiClient.mockResolvedValueOnce({ meta: {} });

    const result = await fetchAnalyticsInsights();
    expect(result).toEqual([]);
  });
});
