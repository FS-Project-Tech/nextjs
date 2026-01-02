import { NextRequest, NextResponse } from 'next/server';
import { fetchProducts } from '@/lib/woocommerce';
import {
  cached,
  productsKey,
  CACHE_TTL,
  CACHE_TAGS,
  PRODUCT_CACHE_HEADERS,
} from '@/lib/cache';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Sanitize string input - remove dangerous characters
 */
function sanitizeInput(input: string | null): string {
  if (!input) return '';
  return input
    .replace(/[<>'"`;\\]/g, '')
    .replace(/\.\./g, '')
    .trim()
    .slice(0, 200);
}

/**
 * Validate and clamp numeric input
 */
function sanitizeNumber(
  input: string | null,
  min: number,
  max: number,
  defaultVal: number
): number {
  if (!input) return defaultVal;
  const num = parseInt(input, 10);
  if (isNaN(num)) return defaultVal;
  return Math.min(Math.max(num, min), max);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Cache bypass (admin / debug safe)
    const bypassCache =
      request.headers.get('cache-control')?.includes('no-cache') ||
      request.headers.get('x-bypass-cache') === 'true';

    const params: Record<string, any> = {};

    // Pagination (hard limits)
    params.per_page = sanitizeNumber(searchParams.get('per_page'), 1, 100, 24);
    params.page = sanitizeNumber(searchParams.get('page'), 1, 1000, 1);

    // Prevent deep OFFSET abuse (Woo safety)
    if (params.page > 100 && !searchParams.get('search')) {
      params.page = 100;
    }

    // Category
    const categoryParam =
      searchParams.get('category') || searchParams.get('categorySlug');
    if (categoryParam) params.categorySlug = sanitizeInput(categoryParam);

    const categories = searchParams.get('categories');
    if (categories) params.categories = sanitizeInput(categories);

    // Filters
    const brands = searchParams.get('brands');
    if (brands) params.brands = sanitizeInput(brands);

    const tags = searchParams.get('tags') || searchParams.get('tag');
    if (tags) params.tags = sanitizeInput(tags);

    // Price filters (numeric only)
    const minPrice = searchParams.get('minPrice');
    if (minPrice && /^\d+(\.\d+)?$/.test(minPrice)) {
      params.minPrice = minPrice;
    }

    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice && /^\d+(\.\d+)?$/.test(maxPrice)) {
      params.maxPrice = maxPrice;
    }

    // Sorting (whitelist)
    const sortBy = searchParams.get('sortBy');
    const allowedSorts = [
      'price-asc',
      'price-desc',
      'date',
      'popularity',
      'rating',
      'title',
      'default',
    ];
    if (sortBy && allowedSorts.includes(sortBy)) {
      params.sortBy = sortBy;
    }

    // Search
    const search =
      searchParams.get('search') ||
      searchParams.get('query') ||
      searchParams.get('Search');
    if (search && search.trim()) {
      params.search = sanitizeInput(search).slice(0, 100);
    }

    // Featured
    const featured = searchParams.get('featured');
    if (featured === 'true' || featured === '1') {
      params.featured = true;
    }

    // Include product IDs
    const include = searchParams.get('include');
    if (include) {
      const ids = include
        .split(',')
        .filter((id) => /^\d+$/.test(id.trim()))
        .map((id) => parseInt(id.trim(), 10));

      if (ids.length > 0) {
        params.include = ids;
      }
    }

    /**
     * WooCommerce performance guard:
     * Avoid expensive combinations
     */
    if (params.search && (params.tags || params.brands)) {
      delete params.tags;
      delete params.brands;
    }

    /**
     * Ensure stable cache key (sorted params)
     */
    const stableParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, any>);

    const cacheKey = productsKey(stableParams);

    if (isDev) {
      console.log('📥 /api/products params:', stableParams);
      console.log('🧠 Cache key:', cacheKey);
    }

    const result = await cached(
      cacheKey,
      () => fetchProducts(stableParams),
      {
        ttl: CACHE_TTL.PRODUCTS,
        tags: [CACHE_TAGS.PRODUCTS],
        skipCache: bypassCache,
      }
    );

    if (isDev) {
      console.log('📤 /api/products response:', {
        products: result.products.length,
        total: result.total,
        pages: result.totalPages,
        cached: !bypassCache,
      });
    }

    return NextResponse.json(result, {
      headers: {
        ...PRODUCT_CACHE_HEADERS,
        'X-Cache-Key': cacheKey,
        'Content-Type': 'application/json',
        'Vary': 'Accept-Encoding',
      },
    });
  } catch (error) {
    if (isDev) {
      console.error('❌ /api/products error:', error);
    }

    return NextResponse.json(
      {
        error: 'Unable to load products',
        products: [],
        total: 0,
        totalPages: 0,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  }
}