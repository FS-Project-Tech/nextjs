import { NextRequest, NextResponse } from 'next/server';
import { getWpBaseUrl } from '@/lib/auth';
import { createProtectedApiHandler, API_TIMEOUT } from '@/lib/api-middleware';
import { sanitizeObject } from '@/lib/sanitize';

/**
 * GET /api/dashboard/orders
 * Fetch orders for the authenticated user using the Headless Woo API Gateway
 * Protected with JWT authentication, rate limiting, and response sanitization
 * 
 * This endpoint uses the API Gateway plugin which automatically:
 * - Validates JWT token
 * - Gets current user ID
 * - Returns only that user's orders
 * - Handles pagination
 */
async function getOrders(req: NextRequest, context: { user: any; token: string }) {
  try {
    const { token } = context;

    const wpBase = getWpBaseUrl();
    if (!wpBase) {
      return NextResponse.json(
        { error: 'WordPress URL not configured' },
        { status: 500 }
      );
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = 10; // Display 10 orders per page

    // Use the new API Gateway endpoint
    // This endpoint automatically handles user-scoping and authentication
    const gatewayUrl = new URL(`${wpBase}/wp-json/api/v1/my-orders`);
    gatewayUrl.searchParams.set('per_page', perPage.toString());
    gatewayUrl.searchParams.set('page', page.toString());

    const ordersResponse = await fetch(gatewayUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to fetch orders' };
      }

      console.error('Gateway orders fetch failed:', {
        status: ordersResponse.status,
        error: errorData,
      });

      return NextResponse.json(
        { 
          error: errorData.message || errorData.error || 'Failed to fetch orders',
          debug: process.env.NODE_ENV === 'development' ? errorData : undefined
        },
        { status: ordersResponse.status }
      );
    }

    const gatewayData = await ordersResponse.json();

    // Gateway returns: { orders: [...], total, per_page, current_page, total_pages }
    const gatewayOrders = gatewayData.orders || [];
    const pagination = gatewayData.pagination || {
      total: gatewayData.total || 0,
      per_page: gatewayData.per_page || perPage,
      current_page: gatewayData.current_page || page,
      total_pages: gatewayData.total_pages || 0,
    };

    // Transform API Gateway response to match frontend expectations
    // Frontend expects: line_items (not items), billing, shipping
    const transformedOrders = gatewayOrders.map((order: any) => {
      // Transform items to line_items format expected by frontend
      const line_items = (order.items || []).map((item: any, index: number) => ({
        id: index + 1, // Generate sequential ID
        name: item.name || '',
        quantity: item.qty || 0,
        price: item.price?.toString() || '0',
        product_id: item.product_id || 0,
        image: item.image || undefined,
      }));

      return {
        id: order.id,
        status: order.status,
        date_created: order.date_created,
        total: order.total?.toString() || '0',
        currency: order.currency || 'USD',
        line_items,
        // Use billing and shipping from gateway (now included in plugin response)
        billing: order.billing ? {
          first_name: order.billing.first_name || '',
          last_name: order.billing.last_name || '',
          email: order.billing.email || '',
          phone: order.billing.phone || '',
          address_1: order.billing.address_1 || '',
          address_2: order.billing.address_2 || '',
          city: order.billing.city || '',
          state: order.billing.state || '',
          postcode: order.billing.postcode || '',
          country: order.billing.country || '',
        } : {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          address_1: '',
          address_2: '',
          city: '',
          state: '',
          postcode: '',
          country: '',
        },
        shipping: order.shipping ? {
          first_name: order.shipping.first_name || '',
          last_name: order.shipping.last_name || '',
          address_1: order.shipping.address_1 || '',
          address_2: order.shipping.address_2 || '',
          city: order.shipping.city || '',
          state: order.shipping.state || '',
          postcode: order.shipping.postcode || '',
          country: order.shipping.country || '',
        } : {
          first_name: '',
          last_name: '',
          address_1: '',
          address_2: '',
          city: '',
          state: '',
          postcode: '',
          country: '',
        },
      };
    });

    const sanitizedOrders = transformedOrders.map((order: any) => sanitizeObject(order));

    return NextResponse.json({ 
      orders: sanitizedOrders,
      pagination: {
        page: pagination.current_page || page,
        per_page: pagination.per_page || perPage,
        total: pagination.total || 0,
        total_pages: pagination.total_pages || 0,
      }
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching orders' },
      { status: 500 }
    );
  }
}

// Export with security middleware
export const GET = createProtectedApiHandler(getOrders, {
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute (lower for authenticated routes)
  },
  timeout: API_TIMEOUT.DEFAULT,
  sanitize: true,
  allowedMethods: ['GET'],
});