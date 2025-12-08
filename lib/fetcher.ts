import { instrumentedFetch } from './monitoring/fetch-instrumentation';

type FetchCacheMode = 'force-cache' | 'no-store' | 'reload' | 'only-if-cached';

interface FetcherOptions extends RequestInit {
  /**
   * Custom cache key (otherwise derived from URL + body)
   */
  cacheKey?: string;
  /**
   * TTL in milliseconds for in-memory SSR cache.
   * Defaults to 30s on server, disabled on client.
   */
  ttl?: number;
  /**
   * Enable/disable deduplication of concurrent identical requests.
   * Defaults to true.
   */
  dedupe?: boolean;
  /**
   * Skip in-memory cache (still uses Next.js fetch cache if configured)
   */
  bypassMemoryCache?: boolean;
  /**
    * Revalidate time (seconds) for Next.js fetch cache / ISR
   */
  revalidate?: number;
  /**
   * Force fetch cache mode
   */
  fetchCache?: FetchCacheMode;
  /**
   * Return raw Response instead of JSON body
   */
  returnResponse?: boolean;
  /**
   * Optional route name for instrumentation
   */
  route?: string;
}

type MemoryCacheEntry<T> = {
  data: T;
  expires: number;
};

const isServer = typeof window === 'undefined';

const globalMemoryCache: Map<string, MemoryCacheEntry<any>> = isServer
  ? (globalThis as any).__NEXT_SSR_MEMORY_CACHE__ ?? ((globalThis as any).__NEXT_SSR_MEMORY_CACHE__ = new Map())
  : new Map();

const dedupeMap: Map<string, Promise<any>> = isServer
  ? (globalThis as any).__NEXT_SSR_DEDUPE_MAP__ ?? ((globalThis as any).__NEXT_SSR_DEDUPE_MAP__ = new Map())
  : new Map();

function createCacheKey(input: RequestInfo | URL, options?: RequestInit & { cacheKey?: string }) {
  if (options?.cacheKey) {
    return options.cacheKey;
  }

  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const body = options?.body;
  const method = options?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET');

  return `${method}:${url}:${typeof body === 'string' ? body : ''}`;
}

function getFromMemoryCache<T>(key: string): T | null {
  const entry = globalMemoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expires) {
    globalMemoryCache.delete(key);
    return null;
  }

  return entry.data;
}

function setMemoryCache<T>(key: string, data: T, ttl: number) {
  globalMemoryCache.set(key, { data, expires: Date.now() + ttl });
}

export async function fetchWithCache<T = any>(
  input: RequestInfo | URL,
  options: FetcherOptions = {}
): Promise<T> {
  const {
    cacheKey,
    ttl = 30_000,
    dedupe = true,
    bypassMemoryCache = false,
    revalidate,
    fetchCache,
    returnResponse,
    route,
    headers,
    ...rest
  } = options;

  const key = createCacheKey(input, { cacheKey, ...options });

  if (isServer && !bypassMemoryCache && ttl > 0) {
    const cached = getFromMemoryCache<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  if (dedupe && dedupeMap.has(key)) {
    return dedupeMap.get(key)!;
  }

  const fetchPromise = (async () => {
    const fetchOptions: RequestInit = {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (fetchCache) {
      (fetchOptions as any).cache = fetchCache;
    }

    if (typeof revalidate === 'number') {
      (fetchOptions as any).next = {
        ...(fetchOptions as any).next,
        revalidate,
      };
    }

    const normalizedInput: string | URL =
      typeof input === 'string' || input instanceof URL
        ? input
        : (input as Request).url;

    const response = await instrumentedFetch(normalizedInput, fetchOptions, route);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`Fetch failed (${response.status}): ${errorBody || response.statusText}`);
    }

    if (returnResponse) {
      return response as unknown as T;
    }

    const data = (await response.json()) as T;

    if (isServer && !bypassMemoryCache && ttl > 0) {
      setMemoryCache(key, data, ttl);
    }

    return data;
  })();

  if (dedupe) {
    dedupeMap.set(key, fetchPromise);
  }

  try {
    return await fetchPromise;
  } finally {
    if (dedupe) {
      dedupeMap.delete(key);
    }
  }
}

