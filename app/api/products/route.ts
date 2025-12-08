import { NextRequest, NextResponse } from 'next/server';
import { fetchProducts } from '@/lib/woocommerce';
import { 
  cached, 
  productsKey, 
  CACHE_TTL, 
  CACHE_TAGS,
  getCacheHeaders,
  PRODUCT_CACHE_HEADERS,
} from '@/lib/cache';

/**
 * Sanitize string input - remove dangerous characters
 */
function sanitizeInput(input: string | null): string {
  if (!input) return '';
  return input
    .replace(/[<>'"`;\\]/g, '') // Remove dangerous chars
    .replace(/\.\./g, '') // Prevent path traversal
    .trim()
    .slice(0, 200); // Limit length
}

/**
 * Validate and clamp numeric input
 */
function sanitizeNumber(input: string | null, min: number, max: number, defaultVal: number): number {
  if (!input) return defaultVal;
  const num = parseInt(input, 10);
  if (isNaN(num)) return defaultVal;
  return Math.min(Math.max(num, min), max);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Check for cache bypass
    const bypassCache = request.headers.get('cache-control')?.includes('no-cache') ||
                        request.headers.get('x-bypass-cache') === 'true';
    
    // Extract and validate all parameters
    const params: Record<string, any> = {};
    
    // Pagination (with bounds validation)
    params.per_page = sanitizeNumber(searchParams.get('per_page'), 1, 100, 24);
    params.page = sanitizeNumber(searchParams.get('page'), 1, 1000, 1);
    
    // Category (sanitized)
    const categoryParam = searchParams.get('category') || searchParams.get('categorySlug');
    if (categoryParam) params.categorySlug = sanitizeInput(categoryParam);
    
    const categories = searchParams.get('categories');
    if (categories) params.categories = sanitizeInput(categories);
    
    // Filters (sanitized)
    const brands = searchParams.get('brands');
    if (brands) params.brands = sanitizeInput(brands);
    
    const tags = searchParams.get('tags') || searchParams.get('tag');
    if (tags) params.tags = sanitizeInput(tags);
    
    // Price validation (numeric only)
    const minPrice = searchParams.get('minPrice');
    if (minPrice && /^\d+(\.\d+)?$/.test(minPrice)) params.minPrice = minPrice;
    
    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice && /^\d+(\.\d+)?$/.test(maxPrice)) params.maxPrice = maxPrice;
    
    // Sorting (whitelist validation)
    const sortBy = searchParams.get('sortBy');
    const allowedSorts = ['price-asc', 'price-desc', 'date', 'popularity', 'rating', 'title', 'default'];
    if (sortBy && allowedSorts.includes(sortBy)) params.sortBy = sortBy;
    
    // Search (sanitized, limit length)
    const search = searchParams.get('search') || searchParams.get('query') || searchParams.get('Search');
    if (search && search.trim()) {
      params.search = sanitizeInput(search).slice(0, 100); // Limit search length
    }
    
    // Featured (boolean validation)
    const featured = searchParams.get('featured');
    if (featured === 'true' || featured === '1') params.featured = true;

    // Include specific product IDs
    const include = searchParams.get('include');
    if (include) {
      // Validate: only allow comma-separated numbers
      const ids = include.split(',').filter(id => /^\d+$/.test(id.trim())).map(id => parseInt(id.trim(), 10));
      if (ids.length > 0) {
        params.include = ids;
      }
    }

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📥 API Route /api/products - Params:', params);
    }

    // Generate cache key
    const cacheKey = productsKey(params);
    
    // Fetch products with caching
    const result = await cached(
      cacheKey,
      () => fetchProducts(params),
      {
        ttl: CACHE_TTL.PRODUCTS,
        tags: [CACHE_TAGS.PRODUCTS],
        skipCache: bypassCache,
      }
    );
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 API Route /api/products - Response:', {
        productsCount: result.products.length,
        total: result.total,
        totalPages: result.totalPages,
        cached: !bypassCache,
      });
    }

    // Return standardized format with cache headers
    return NextResponse.json(result, {
      headers: {
        ...PRODUCT_CACHE_HEADERS,
        'X-Cache-Key': cacheKey,
      },
    });
    
  } catch (error) {
    // Log full error server-side only
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Route /api/products - Error:', error);
    }
    
    // Return generic error without leaking internal details
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
