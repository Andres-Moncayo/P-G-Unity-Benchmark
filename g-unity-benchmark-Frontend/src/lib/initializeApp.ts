import { API_BASE_URL } from '../services/apiClient';
import {
  DEMO_TOKEN,
  DEMO_USER,
  enableOfflineMode,
  isOfflineModeForced,
} from '../config/offlineMode';
import { useSettingsStore } from '../store/useSettingsStore';

/** Tiempo máximo total para decidir si entramos en modo demo. */
const INIT_TIMEOUT_MS = 2500;
/** Tiempo máximo por petición de health check. */
const REQUEST_TIMEOUT_MS = 1500;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function isBackendAndDbHealthy(): Promise<boolean> {
  if (isOfflineModeForced()) return false;

  const base = API_BASE_URL;
  const healthUrl = `${base}/health`;
  const dbStatusUrl = `${base}/api/v1/monitorization/db_status`;

  const [healthRes, dbRes] = await Promise.all([
    fetchWithTimeout(healthUrl, REQUEST_TIMEOUT_MS),
    fetchWithTimeout(dbStatusUrl, REQUEST_TIMEOUT_MS),
  ]);

  if (!healthRes?.ok || !dbRes?.ok) return false;

  try {
    const data = (await dbRes.json()) as { connected?: boolean };
    return data.connected === true;
  } catch {
    return false;
  }
}

function autoLoginDemoUser(): void {
  useSettingsStore.getState().login(DEMO_USER, DEMO_TOKEN);
}

export interface AppInitResult {
  offline: boolean;
}

/**
 * Detecta si el backend/PostgreSQL están disponibles.
 * Si no lo están, activa modo demo con datos mockeados y sesión automática.
 */
export async function initializeApp(): Promise<AppInitResult> {
  if (isOfflineModeForced()) {
    enableOfflineMode();
    autoLoginDemoUser();
    return { offline: true };
  }

  const healthy = await Promise.race([
    isBackendAndDbHealthy(),
    new Promise<false>((resolve) => {
      window.setTimeout(() => resolve(false), INIT_TIMEOUT_MS);
    }),
  ]);

  if (!healthy) {
    enableOfflineMode();
    autoLoginDemoUser();
    return { offline: true };
  }

  return { offline: false };
}
