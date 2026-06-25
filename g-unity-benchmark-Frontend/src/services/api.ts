const DEFAULT_BASE_URL = "http://localhost:8000/api/v1";

function getBaseUrl(): string {
  const env = import.meta.env.VITE_API_BASE_URL;
  return (typeof env === "string" && env.trim()) || DEFAULT_BASE_URL;
}

function getAuthToken(): string | null {
  const env = import.meta.env.VITE_API_TOKEN;
  return typeof env === "string" && env.trim() ? env.trim() : null;
}

const DEFAULT_TIMEOUT_MS = 25_000;

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const base = getBaseUrl().replace(/\/$/, "");
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    const { timeoutMs: _t, ...fetchInit } = init ?? {};
    response = await fetch(url, {
      ...fetchInit,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "La API tardó demasiado (timeout). Suele indicar que PostgreSQL remoto no responde.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body && typeof body.detail === "string") {
        detail = body.detail;
      } else if (body && typeof body.detail === "object") {
        detail = JSON.stringify(body.detail);
      }
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
