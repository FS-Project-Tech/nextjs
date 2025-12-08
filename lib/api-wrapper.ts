/**
 * Universal API Route Wrapper
 * Applies CORS, security headers, and error handling to all API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsPreflight } from './cors';
import { secureResponse } from './security-headers';

export type ApiHandler = (
  req: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse>;

/**
 * Wrap API route handler with CORS, security headers, and error handling
 */
export function withApiWrapper(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: { params?: any }) => {
    try {
      // Handle CORS preflight
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }

      // Execute handler
      const response = await handler(req, context);

      // Apply CORS headers
      const corsResponse = applyCorsHeaders(req, response);

      // Apply security headers (if not already applied)
      if (!corsResponse.headers.get('X-Content-Type-Options')) {
        return secureResponse(
          await corsResponse.json().catch(() => ({})),
          {
            status: corsResponse.status,
            headers: corsResponse.headers,
          }
        );
      }

      return corsResponse;
    } catch (error) {
      console.error('API route error:', error);
      
      const errorResponse = secureResponse(
        {
          error: process.env.NODE_ENV === 'development' 
            ? (error instanceof Error ? error.message : 'An error occurred') 
            : 'An error occurred processing your request',
        },
        { status: 500 }
      );

      return applyCorsHeaders(req, errorResponse);
    }
  };
}

/**
 * Create GET handler with wrapper
 */
export function GET(handler: ApiHandler) {
  return withApiWrapper(async (req, context) => {
    if (req.method !== 'GET') {
      return secureResponse({ error: 'Method not allowed' }, { status: 405 });
    }
    return handler(req, context);
  });
}

/**
 * Create POST handler with wrapper
 */
export function POST(handler: ApiHandler) {
  return withApiWrapper(async (req, context) => {
    if (req.method !== 'POST') {
      return secureResponse({ error: 'Method not allowed' }, { status: 405 });
    }
    return handler(req, context);
  });
}

/**
 * Create PUT handler with wrapper
 */
export function PUT(handler: ApiHandler) {
  return withApiWrapper(async (req, context) => {
    if (req.method !== 'PUT') {
      return secureResponse({ error: 'Method not allowed' }, { status: 405 });
    }
    return handler(req, context);
  });
}

/**
 * Create DELETE handler with wrapper
 */
export function DELETE(handler: ApiHandler) {
  return withApiWrapper(async (req, context) => {
    if (req.method !== 'DELETE') {
      return secureResponse({ error: 'Method not allowed' }, { status: 405 });
    }
    return handler(req, context);
  });
}

