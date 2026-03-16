/**
 * Response Layer Caching System for Next.js
 *
 * Features:
 * - In-memory cache with TTL
 * - Stale-while-revalidate
 * - Request deduplication
 * - Tag-based invalidation
 * - LRU eviction
 */

import { getCacheHeaders } from "./api-cache";

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleAt?: number;
  tags: string[];
}

export interface CacheOptions {
  ttl?: number;
  swr?: number;
  tags?: string[];
  skipCache?: boolean;
  forceRefresh?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  keys: number;
}



/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const DEFAULT_TTL = 60;
const MAX_CACHE_SIZE = 500;

/* TTL presets */

export const CACHE_TTL = {
  CART: 30,
  SESSION: 30,

  PRODUCTS: 120,
  SEARCH: 120,

  CATEGORIES: 600,
  BRANDS: 600,

  STATIC: 3600,
  CMS: 3600,

  PERMANENT: 86400,
} as const;

/* Tags */

export const CACHE_TAGS = {
  PRODUCTS: "products",
  CATEGORIES: "categories",
  BRANDS: "brands",
  CMS: "cms",
  USER: "user",
  CART: "cart",
  ORDERS: "orders",
} as const;

/* -------------------------------------------------------------------------- */
/* Cache Store                                                                */
/* -------------------------------------------------------------------------- */

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private tagIndex = new Map<string, Set<string>>();
  private pendingRequests = new Map<string, Promise<any>>();

  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    keys: 0,
  };

  /* -------------------------------------------------------------------------- */

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();

    if (now > entry.expiresAt && (!entry.staleAt || now > entry.staleAt)) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    if (now > entry.expiresAt && entry.staleAt && now <= entry.staleAt) {
      this.stats.staleHits++;
      return { data: entry.data as T, isStale: true };
    }

    this.stats.hits++;
    return { data: entry.data as T, isStale: false };
  }

  /* -------------------------------------------------------------------------- */

  set<T>(key: string, data: T, options: CacheOptions = {}) {
    const { ttl = DEFAULT_TTL, swr, tags = [] } = options;

    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl * 1000,
      staleAt: swr ? now + (ttl + swr) * 1000 : now + ttl * 2000,
      tags,
    };

    this.evictIfNecessary();

    this.cache.set(key, entry);

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }

      this.tagIndex.get(tag)!.add(key);
    }

    this.stats.keys = this.cache.size;
  }

  /* -------------------------------------------------------------------------- */

  delete(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) return false;

    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(key);
    }

    this.cache.delete(key);
    this.stats.keys = this.cache.size;

    return true;
  }

  /* -------------------------------------------------------------------------- */

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);

    if (!keys) return 0;

    let count = 0;

    for (const key of keys) {
      if (this.delete(key)) count++;
    }

    this.tagIndex.delete(tag);

    return count;
  }

  invalidateAll() {
    this.cache.clear();
    this.tagIndex.clear();
    this.stats.keys = 0;
  }

  /* -------------------------------------------------------------------------- */

  getPending<T>(key: string): Promise<T> | null {
    return this.pendingRequests.get(key) as Promise<T> | null;
  }

  setPending<T>(key: string, promise: Promise<T>) {
    this.pendingRequests.set(key, promise);

    promise.finally(() => {
      this.pendingRequests.delete(key);
    });
  }

  /* -------------------------------------------------------------------------- */

  getStats(): CacheStats {
    return { ...this.stats };
  }

  /* -------------------------------------------------------------------------- */

  private evictIfNecessary() {
    if (this.cache.size < MAX_CACHE_SIZE) return;

    const deleteCount = Math.floor(MAX_CACHE_SIZE * 0.2);

    const keys = Array.from(this.cache.keys());

    for (let i = 0; i < deleteCount; i++) {
      this.delete(keys[i]);
    }
  }
}

/* Singleton */

export const responseCache = new ResponseCache();

/* -------------------------------------------------------------------------- */
/* Cached Wrapper                                                             */
/* -------------------------------------------------------------------------- */

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { skipCache, forceRefresh } = options;

  if (skipCache) {
    return fetcher();
  }

  const pending = responseCache.getPending<T>(key);

  if (pending && !forceRefresh) {
    return pending;
  }

  const cachedEntry = !forceRefresh ? responseCache.get<T>(key) : null;

  if (cachedEntry && !cachedEntry.isStale) {
    return cachedEntry.data;
  }

  const fetchPromise = fetcher()
    .then((data) => {
      responseCache.set(key, data, options);
      return data;
    })
    .catch((error) => {
      if (cachedEntry?.data) {
        console.warn(`[Cache] returning stale data for ${key}`);
        return cachedEntry.data;
      }

      throw error;
    });

  responseCache.setPending(key, fetchPromise);

  if (cachedEntry?.isStale) {
    fetchPromise.catch(() => {});
    return cachedEntry.data;
  }

  return fetchPromise;
}

/* -------------------------------------------------------------------------- */
/* Cache Key Helpers                                                          */
/* -------------------------------------------------------------------------- */

function normalizeParams(params: Record<string, any>) {
  return Object.keys(params)
    .sort()
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

export function productsKey(params: Record<string, any>) {
  return `products:${normalizeParams(params) || "default"}`;
}

export function categoriesKey(params: Record<string, any>) {
  return `categories:${normalizeParams(params) || "all"}`;
}

export function productKey(idOrSlug: string | number) {
  return `product:${idOrSlug}`;
}

export function searchKey(query: string, params: Record<string, any> = {}) {
  return `search:${query}:${normalizeParams(params)}`;
}

/* -------------------------------------------------------------------------- */
/* Invalidation                                                               */
/* -------------------------------------------------------------------------- */

export function invalidateProducts() {
  responseCache.invalidateByTag(CACHE_TAGS.PRODUCTS);
}

export function invalidateCategories() {
  responseCache.invalidateByTag(CACHE_TAGS.CATEGORIES);
}

export function invalidateAll() {
  responseCache.invalidateAll();
}

/* -------------------------------------------------------------------------- */

export interface CacheHeaders {
  "Cache-Control": string;
  "CDN-Cache-Control"?: string;
  "Vercel-CDN-Cache-Control"?: string;
  "Surrogate-Control"?: string;
} 


export default responseCache;
export { getCacheHeaders } from "./api-cache";