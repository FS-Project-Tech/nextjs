import { NextRequest, NextResponse } from 'next/server';
import { fetchCategories } from '@/lib/woocommerce';
import {
  cached,
  categoriesKey,
  CACHE_TTL,
  CACHE_TAGS,
} from '@/lib/cache/index';
import { PRODUCT_CACHE_HEADERS } from '@/lib/cache/api-cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const bypassCache =
      request.headers.get('cache-control')?.includes('no-cache') ||
      request.headers.get('x-bypass-cache') === 'true';

    const params: {
      per_page?: number;
      parent?: number;
      hide_empty?: boolean;
    } = {};

    searchParams.forEach((value, key) => {
      if (key === 'per_page') {
        params.per_page = parseInt(value, 10);
      } else if (key === 'parent') {
        params.parent = parseInt(value, 10);
      } else if (key === 'hide_empty') {
        params.hide_empty = value === 'true' || value === '1';
      }
    });

    const cacheKey = categoriesKey(params);

    const categories = await cached(
      cacheKey,
      () => fetchCategories(params),
      {
        ttl: CACHE_TTL.CATEGORIES,
        tags: [CACHE_TAGS.CATEGORIES],
        skipCache: bypassCache,
      }
    );

    return NextResponse.json(categories, {
      headers: {
        ...PRODUCT_CACHE_HEADERS,
        'X-Cache-Key': cacheKey,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);

    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}