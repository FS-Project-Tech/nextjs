import { NextRequest, NextResponse } from 'next/server';
import { getWpBaseUrl } from '@/lib/auth';
import { secureResponse } from '@/lib/security-headers';
import { applyCorsHeaders } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(req, response);
}

/**
 * GET /api/cms/acf-options
 * Proxy endpoint for WordPress ACF options
 * Prevents direct browser → WordPress calls
 */
export async function GET(req: NextRequest) {
  try {
    const wpBase = getWpBaseUrl();

    if (!wpBase) {
      return applyCorsHeaders(
        req,
        secureResponse(
          { error: 'WordPress URL not configured' },
          { status: 500 }
        )
      );
    }

    const response = await fetch(`${wpBase}/wp-json/acf/v3/options/options`, {
      next: { revalidate: 10 },
    });

    if (!response.ok) {
      return applyCorsHeaders(
        req,
        secureResponse(
          { error: 'ACF options not found' },
          { status: response.status }
        )
      );
    }

    const acfData = await response.json();

    const apiResponse = secureResponse(acfData, {
      headers: {
        'Cache-Control': 'public, max-age=10, s-maxage=10',
      },
    });

    return applyCorsHeaders(req, apiResponse);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ACF options fetch error:', error);
    }

    return applyCorsHeaders(
      req,
      secureResponse(
        { error: 'Failed to fetch ACF options' },
        { status: 500 }
      )
    );
  }
}