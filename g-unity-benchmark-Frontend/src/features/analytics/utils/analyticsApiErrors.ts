import { ApiError } from '../../../services/apiClient';

const DB_UNAVAILABLE_CODE = 'database_unavailable';

const DEFAULT_DB_MESSAGE =
  'No se pudo conectar a la base de datos. Comprueba que el backend esté en marcha y DATABASE_URL en .env sea correcta.';

function extractDetailPayload(detail: unknown): Record<string, unknown> | null {
  if (!detail || typeof detail !== 'object') return null;
  const root = detail as Record<string, unknown>;
  const inner = root.detail;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return root;
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 503) return false;
  const payload = extractDetailPayload(error.detail);
  if (!payload) return true;
  if (payload.code === DB_UNAVAILABLE_CODE) return true;
  if (typeof payload.detail === 'string' && /db connection/i.test(payload.detail)) return true;
  return typeof payload.message === 'string';
}

export function getAnalyticsErrorClassName(error: unknown): string {
  return isDatabaseUnavailableError(error) ? 'text-amber-200/90 text-sm' : 'text-red-400';
}

export function getAnalyticsErrorMessage(error: unknown, fallback: string): string {
  if (isDatabaseUnavailableError(error)) {
    return getDatabaseUnavailableMessage(error);
  }
  return fallback;
}

export function getDatabaseUnavailableMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return DEFAULT_DB_MESSAGE;
  const payload = extractDetailPayload(error.detail);
  if (payload && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  return DEFAULT_DB_MESSAGE;
}
