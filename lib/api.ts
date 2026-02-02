/**
 * API fetch utilities for client-side requests
 * Used by Header and other components for CMS/API calls with timeout, retries, and fallback
 */

export interface ApiFetchOptions<T = unknown> {
  timeout?: number;
  retries?: number;
  fallback?: T;
  enableLogging?: boolean;
}

/**
 * Fetch JSON from a URL with timeout, retries, and optional fallback
 */
export async function apiFetchJson<T>(
  url: string,
  options: ApiFetchOptions<T> = {}
): Promise<T> {
  const { timeout = 5000, retries = 0, fallback, enableLogging = false } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as T;
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (enableLogging) {
        console.warn(`[api] ${url} attempt ${attempt + 1}/${retries + 1} failed:`, lastError.message);
      }
      if (attempt === retries && fallback !== undefined) {
        return fallback;
      }
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}
