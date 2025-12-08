import { NextRequest, NextResponse } from 'next/server';
import wcAPI from '@/lib/woocommerce';
import { cached, CACHE_TTL, CACHE_TAGS, STATIC_CACHE_HEADERS } from '@/lib/cache';

/**
 * GET /api/filters/brands
 * Returns brands for the filter sidebar
 * 
 * Brands can be stored as:
 * 1. Product attribute (product_brand) - most common
 * 2. Custom taxonomy (product_brand)
 * 3. ACF field
 * 
 * Query params:
 * - category: Optional category slug to get brands for specific category
 */
export async function GET(request: NextRequest) {
  try {
    const categorySlug = request.nextUrl.searchParams.get('category');
    const cacheKey = `brands:${categorySlug || 'all'}`;
    
    // Check for cache bypass
    const bypassCache = request.headers.get('cache-control')?.includes('no-cache');
    
    // Fetch brands with caching
    const brands = await cached(
      cacheKey,
      async () => {
        // Try to fetch brands as product attribute terms (product_brand)
        // This is the most common way to store brands in WooCommerce
        try {
          const response = await wcAPI.get('/products/attributes');
          const attributes = response.data || [];
          
          // Find the brand attribute
          const brandAttribute = attributes.find((attr: any) => 
            attr.slug === 'product_brand' || 
            attr.slug === 'brand' || 
            attr.name?.toLowerCase() === 'brand'
          );
          
          if (brandAttribute) {
            // Fetch terms for this attribute
            const termsResponse = await wcAPI.get(`/products/attributes/${brandAttribute.id}/terms`, {
              params: { per_page: 100, hide_empty: true },
            });
            
            const brandsList = termsResponse.data || [];
            
            return brandsList.map((brand: any) => ({
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              count: brand.count,
            }));
          }
        } catch (attrError) {
          // Attribute approach didn't work, try taxonomy
          if (process.env.NODE_ENV === 'development') {
            console.log('Brand attribute not found, trying taxonomy...');
          }
        }
        
        // Try fetching as custom taxonomy (product_brand)
        try {
          const response = await wcAPI.get('/products/brands', {
            params: { per_page: 100, hide_empty: true },
          });
          
          const brandsList = response.data || [];
          
          if (brandsList.length > 0) {
            return brandsList.map((brand: any) => ({
              id: brand.id,
              name: brand.name,
              slug: brand.slug,
              count: brand.count,
            }));
          }
        } catch (taxError) {
          // Taxonomy approach didn't work either
          if (process.env.NODE_ENV === 'development') {
            console.log('Brand taxonomy not found');
          }
        }
        
        // If no brands found through either method, return empty
        return [];
      },
      {
        ttl: CACHE_TTL.BRANDS,
        tags: [CACHE_TAGS.BRANDS],
        skipCache: bypassCache,
      }
    );
    
    return NextResponse.json({ brands }, {
      headers: {
        ...STATIC_CACHE_HEADERS,
        'X-Cache-Key': cacheKey,
      },
    });
    
  } catch (error) {
    console.error('Error fetching brands:', (error instanceof Error ? error.message : 'An error occurred'));
    return NextResponse.json(
      { error: 'Failed to fetch brands', brands: [] },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}


