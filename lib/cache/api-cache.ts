/**
 * API Route Caching Utilities
 *
 * Provides easy-to-use wrappers for caching API responses in Next.js routes.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  cached,
  CACHE_TTL,
  CACHE_TAGS,
  type CacheOptions,
} from "@/lib/cache/index";   

export const PRODUCT_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ApiCacheOptions extends CacheOptions {
  httpCache?: {
    maxAge?: number;
    sMaxAge?: number;
    staleWhileRevalidate?: number;
    private?: boolean;
    noStore?: boolean;
  };

  keyGenerator?: (request: NextRequest) => string;

  shouldCache?: (request: NextRequest) => boolean;
}

export interface CachedApiResponse<T = any> {
  data: T;
  cached: boolean;
  timestamp: number;
}

/* -------------------------------------------------------------------------- */
/* HTTP Cache Headers                                                         */
/* -------------------------------------------------------------------------- */

export interface CacheHeaders {
  "Cache-Control": string;
}

export function getCacheHeaders(options: {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  private?: boolean;
  noStore?: boolean;
}): CacheHeaders {
  const {
    maxAge = 0,
    sMaxAge,
    staleWhileRevalidate,
    private: isPrivate = false,
    noStore = false,
  } = options;

  if (noStore) {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    };
  }

  const directives: string[] = [];

  directives.push(isPrivate ? "private" : "public");

  if (maxAge > 0) directives.push(`max-age=${maxAge}`);

  if (sMaxAge !== undefined) directives.push(`s-maxage=${sMaxAge}`);

  if (staleWhileRevalidate)
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);

  return {
    "Cache-Control": directives.join(", "),
  };
}


/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function stableSerialize(obj: Record<string, any>) {
  return Object.keys(obj)
    .sort()
    .map((k) => `${k}:${obj[k]}`)
    .join("|");
}

/* -------------------------------------------------------------------------- */
/* API Cache Wrapper                                                          */
/* -------------------------------------------------------------------------- */

export function withApiCache<T>(
  handler: (request: NextRequest) => Promise<T>,
  options: ApiCacheOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const {
      ttl = CACHE_TTL.PRODUCTS,
      tags = [],
      httpCache,
      keyGenerator,
      shouldCache,
      ...cacheOptions
    } = options;

    if (shouldCache && !shouldCache(request)) {
      const data = await handler(request);

      return createResponse(data, false, {
        "Cache-Control": "no-store",
      });
    }

    const cacheKey =
      keyGenerator?.(request) ??
      `api:${request.nextUrl.pathname}?${getSearchParamsKey(request)}`;

    const noCache = request.headers.get("cache-control")?.includes("no-cache");

    const forceRefresh = noCache || cacheOptions.forceRefresh;

    try {
      const data = await cached<T>(
        cacheKey,
        () => handler(request),
        {
          ttl,
          tags,
          forceRefresh,
          ...cacheOptions,
        }
      );

      const headers = httpCache
        ? getCacheHeaders(httpCache)
        : getCacheHeaders({
            maxAge: 10, // browser cache
            sMaxAge: ttl, // CDN cache
            staleWhileRevalidate: ttl * 2,
          });

      return createResponse(data, !forceRefresh, headers);
    } catch (error) {
      console.error(`[API Cache] Error for ${cacheKey}`, error);
      throw error;
    }
  };
}

/* -------------------------------------------------------------------------- */
/* Response Helpers                                                           */
/* -------------------------------------------------------------------------- */

function createResponse<T>(
  data: T,
  cached: boolean,
  headers: CacheHeaders
): NextResponse {
  const body =
    typeof data === "object" && data !== null && !Array.isArray(data)
      ? {
          ...(data as object),
          _cached: cached,
          _timestamp: Date.now(),
        }
      : data;

  return NextResponse.json(body, {
    headers: {
      ...headers,
      "X-Cache": cached ? "HIT" : "MISS",
      "X-Cache-Timestamp": String(Date.now()),
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Simple Cache Helpers                                                       */
/* -------------------------------------------------------------------------- */

export async function cacheResult<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.PRODUCTS,
  tags: string[] = []
): Promise<T> {
  return cached(key, fetcher, { ttl, tags });
}

export async function getCachedProducts<T>(
  params: Record<string, any>,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `products:${stableSerialize(params)}`;

  return cached(key, fetcher, {
    ttl: CACHE_TTL.PRODUCTS,
    tags: [CACHE_TAGS.PRODUCTS],
  });
}

export async function getCachedCategories<T>(
  params: Record<string, any>,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `categories:${stableSerialize(params)}`;

  return cached(key, fetcher, {
    ttl: CACHE_TTL.CATEGORIES,
    tags: [CACHE_TAGS.CATEGORIES],
  });
}

export async function getCachedProduct<T>(
  idOrSlug: string | number,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `product:${idOrSlug}`;

  return cached(key, fetcher, {
    ttl: CACHE_TTL.PRODUCTS,
    tags: [CACHE_TAGS.PRODUCTS, `product:${idOrSlug}`],
  });
}

/* -------------------------------------------------------------------------- */
/* Request Helpers                                                            */
/* -------------------------------------------------------------------------- */

export function getSearchParamsKey(request: NextRequest): string {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  return stableSerialize(params);
}

export function shouldBypassCache(request: NextRequest): boolean {
  const cacheControl = request.headers.get("cache-control");

  if (
    cacheControl?.includes("no-cache") ||
    cacheControl?.includes("no-store")
  ) {
    return true;
  }

  if (request.headers.get("x-bypass-cache") === "true") {
    return true;
  }

  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    return true;
  }

  return false;
}

/* -------------------------------------------------------------------------- */
/* Response Builders                                                          */
/* -------------------------------------------------------------------------- */

export function cachedResponse<T>(
  data: T,
  options: {
    ttl?: number;
    private?: boolean;
    revalidate?: number;
  } = {}
): NextResponse {
  const { ttl = 60, private: isPrivate = false, revalidate } = options;

  const headers = getCacheHeaders({
    maxAge: 10,
    sMaxAge: ttl,
    staleWhileRevalidate: revalidate ?? ttl * 2,
    private: isPrivate,
  });

  return NextResponse.json(data, {
    headers: headers as unknown as HeadersInit,
  });
}

export function noCacheResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                    */
/* -------------------------------------------------------------------------- */

export {
  CACHE_TTL,
  CACHE_TAGS,
};