import { useSettingsStore } from '../store/useSettingsStore';
import { enableOfflineMode, isOfflineMode } from '../config/offlineMode';
import { hasMockFor, resolveMockResponse } from '../mocks/mockRegistry';

// ─── 1. LÓGICA DE RUTAS (De tu compañero) ───
function resolveApiBaseUrl(): string {
  // Verificamos ambas variables de entorno por si acaso
  const raw = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL) as string | undefined;
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  let base = s.replace(/\/+$/, '');
  if (base.endsWith('/api')) {
    base = base.slice(0, -4);
  }
  return base;
}

const BASE_URL = resolveApiBaseUrl();

function pathAlreadyHasApiPrefix(path: string): boolean {
  return path.startsWith('/api/') || path === '/api';
}

function buildFullPath(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (pathAlreadyHasApiPrefix(path)) {
    return path;
  }
  return `/api/v1${path}`;
}

export const API_BASE_URL = BASE_URL;

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

// ─── 2. MANEJO DE ERRORES (Unificado) ───
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
    message: string,
    public statusText?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isDbOrNetworkFailure(error: unknown, status?: number): boolean {
  if (status === 503 || status === 502 || status === 504) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return false;
}

function tryMockResponse<T>(endpoint: string, method: string, body?: string): T | undefined {
  const mock = resolveMockResponse(endpoint, method, body);
  if (mock === undefined) return undefined;
  return mock as T;
}

// ─── 3. CLIENTE API PRINCIPAL ───
export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const fullPath = buildFullPath(endpoint);
  const url = `${BASE_URL}${fullPath}`;
  const method = (options?.method ?? 'GET').toUpperCase();
  const body = typeof options?.body === 'string' ? options.body : undefined;

  if (isOfflineMode()) {
    const mock = tryMockResponse<T>(endpoint, method, body);
    if (mock !== undefined) {
      if (import.meta.env.DEV) {
        console.debug('[api offline mock]', method, fullPath);
      }
      return mock;
    }
  }

  if (import.meta.env.DEV) {
    console.debug('[api]', url);
  }

  // EL FIX: Sacamos el token de tu bóveda (Zustand), no del localStorage suelto
  const token = useSettingsStore.getState().token;

  // Armamos los headers unificando ambas lógicas
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      ...options,
      headers,
    });
  } catch (error) {
    if (method === 'GET' || method === 'POST') {
      const mock = tryMockResponse<T>(endpoint, method, body);
      if (mock !== undefined) {
        enableOfflineMode();
        return mock;
      }
    }
    throw error;
  }

  // 🔥 Interceptor: solo 401 con token enviado invalida la sesión (no en modo demo).
  if (response.status === 401 && token && !isOfflineMode()) {
    window.history.replaceState(null, '', '/login?expired=true');
    useSettingsStore.getState().logout();
    throw new ApiError(response.status, null, 'Tu sesión ha expirado.');
  }

  if (response.status === 401 && !isOfflineMode()) {
    throw new ApiError(response.status, null, 'Debes iniciar sesión para continuar.');
  }

  if (!response.ok) {
    let detail: unknown;
    const ct = response.headers.get('content-type') ?? '';
    try {
      if (ct.includes('application/json')) {
        detail = await response.json();
      } else {
        const text = await response.text();
        detail = text.slice(0, 500) || undefined;
      }
    } catch {
      detail = undefined;
    }

    if (isDbOrNetworkFailure(null, response.status) && hasMockFor(endpoint, method)) {
      enableOfflineMode();
      const mock = tryMockResponse<T>(endpoint, method, body);
      if (mock !== undefined) return mock;
    }

    // Si es FastAPI y viene un detalle de validación, lo formateamos
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    if (detail && typeof detail === 'object' && 'detail' in detail) {
      const detailData = (detail as { detail: unknown }).detail;
      errorMessage = Array.isArray(detailData)
        ? String((detailData[0] as { msg?: string })?.msg ?? errorMessage)
        : String(detailData);
    } else if (typeof detail === 'string') {
      errorMessage = detail;
    }

    console.error('[api error]', url, errorMessage);
    throw new ApiError(response.status, detail, errorMessage, response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
