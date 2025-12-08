import { NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

/**
 * Search Count API
 * Returns the total number of products available for search
 * Used by SearchBar component to display product count in placeholder
 */
export async function GET() {
  try {
    // Fetch just the total count from WooCommerce (lightweight request)
    const response = await wcAPI.get('/products', {
      params: {
        status: 'publish',
        per_page: 1, // Only need headers, not data
        _fields: 'id', // Minimal field to reduce payload
      },
      timeout: 5000,
    });

    // Extract total from response headers
    const total = parseInt(response.headers['x-wp-total'] || '0', 10);

    return NextResponse.json(
      { count: total },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
        },
      }
    );
  } catch (error) {
    // Handle errors gracefully - return 0 count instead of failing
    // Only log non-timeout errors
    if (error?.code !== 'ECONNABORTED' && error?.code !== 'ETIMEDOUT' && !error?.message?.toLowerCase().includes('timeout')) {
      console.error('Error fetching product count:', error);
    }

    // Return 0 count on error (search will still work, just without count in placeholder)
    return NextResponse.json(
      { count: 0 },
      {
        status: 200, // Return 200 to prevent client-side errors
        headers: {
          'Cache-Control': 'public, s-maxage=60', // Short cache on error
        },
      }
    );
  }
}


