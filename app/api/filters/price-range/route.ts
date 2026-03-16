import { NextRequest, NextResponse } from 'next/server';
import wcAPI from '@/lib/woocommerce';
import {
  cached,
  CACHE_TTL,
  CACHE_TAGS,
} from '@/lib/cache/index';
import { PRODUCT_CACHE_HEADERS } from '@/lib/cache/api-cache';

/**
 * GET /api/filters/price-range
 * Returns min and max price for products, optionally filtered by category
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const minPriceParam = searchParams.get('min_price');
    const maxPriceParam = searchParams.get('max_price');

    const bypassCache =
      request.headers.get('cache-control')?.includes('no-cache') ||
      request.headers.get('x-bypass-cache') === 'true';

    const cacheKey = `price-range:${category || 'all'}:${minPriceParam || 'none'}:${maxPriceParam || 'none'}`;

    const priceRange = await cached(
      cacheKey,
      async () => {
        const perPage = 100;
        let page = 1;
        let hasMore = true;
        let minPrice = Number.POSITIVE_INFINITY;
        let maxPrice = 0;

        while (hasMore) {
          const params: Record<string, string | number> = {
            per_page: perPage,
            page,
            status: 'publish',
          };

          if (category) {
            params.category = category;
          }

          const response = await wcAPI.get('products', { params });
          const products = response.data;

          if (!Array.isArray(products) || products.length === 0) {
            hasMore = false;
            break;
          }

          for (const product of products) {
            const rawPrice =
              product?.sale_price && product.sale_price !== ''
                ? product.sale_price
                : product?.price;

            const price = parseFloat(rawPrice || '0');

            if (!Number.isNaN(price) && price > 0) {
              if (price < minPrice) minPrice = price;
              if (price > maxPrice) maxPrice = price;
            }
          }

          hasMore = products.length === perPage;
          page += 1;
        }

        if (minPrice === Number.POSITIVE_INFINITY) {
          minPrice = 0;
        }

        if (maxPrice < minPrice) {
          maxPrice = minPrice;
        }

        return {
          min_price: minPrice,
          max_price: maxPrice,
          category: category || null,
        };
      },
      {
        ttl: CACHE_TTL.PRODUCTS,
        tags: [CACHE_TAGS.PRODUCTS],
        skipCache: bypassCache,
      }
    );

    return NextResponse.json(priceRange, {
      headers: {
        ...PRODUCT_CACHE_HEADERS,
        'X-Cache-Key': cacheKey,
      },
    });
  } catch (error) {
    console.error('Error fetching price range:', error);

    return NextResponse.json(
      { error: 'Failed to fetch price range' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}