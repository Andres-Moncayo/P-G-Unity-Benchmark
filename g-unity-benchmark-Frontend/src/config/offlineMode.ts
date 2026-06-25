import type { UserSession } from '../store/useSettingsStore';

export const DEMO_USER: UserSession = {
  id: 'offline-demo-user',
  email: 'demo@unity.local',
  name: 'Usuario Demo',
  full_name: 'Usuario Demo',
  role: 'admin',
};

export const DEMO_TOKEN = 'offline-demo-token';

const forcedOffline =
  (import.meta.env.VITE_OFFLINE_MODE as string | undefined)?.trim() === 'true';

let runtimeOffline = forcedOffline;
const listeners = new Set<() => void>();

export function isOfflineModeForced(): boolean {
  return forcedOffline;
}

export function isOfflineMode(): boolean {
  return runtimeOffline;
}

export function enableOfflineMode(): void {
  if (runtimeOffline) return;
  runtimeOffline = true;
  listeners.forEach((fn) => fn());
}

export function subscribeOfflineMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
