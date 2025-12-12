import { NextRequest, NextResponse } from 'next/server';
import { getWpBaseUrl } from '@/lib/auth';
import wcAPI from '@/lib/woocommerce';
import { createProtectedApiHandler, API_TIMEOUT } from '@/lib/api-middleware';
import { sanitizeObject, sanitizeUser } from '@/lib/sanitize';
import { getCustomerIdWithFallback, toIntCustomerId } from '@/lib/customer-utils';

/**
 * GET /api/dashboard/orders
 * Fetch orders for the authenticated user
 * Protected with JWT authentication, rate limiting, and response sanitization
 */
async function getOrders(req: NextRequest, context: { user: any; token: string }) {
  try {
    const { user, token } = context;

    const wpBase = getWpBaseUrl();
    if (!wpBase) {
      return NextResponse.json(
        { error: 'WordPress URL not configured' },
        { status: 500 }
      );
    }

    // Fetch user data to get customer ID (can parallelize with other tasks later)
    const userResponse = await fetch(`${wpBase}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!userResponse.ok) {
      const body = await userResponse.text().catch(() => '');
      return NextResponse.json(
        { error: 'Failed to get user data', detail: body || undefined },
        { status: 401 }
      );
    }

    const userData = await userResponse.json();

    // Get WooCommerce customer ID using optimized hybrid approach
    // This uses: cache -> session endpoint -> email lookup
    let customerId: number | null = await getCustomerIdWithFallback(userData.email, token);

    // If no customer ID found, try to use WordPress user ID as fallback
    if (!customerId && userData.id) {
      customerId = toIntCustomerId(userData.id);
    }

    // Get pagination parameters from query string
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = 10; // Display 10 orders per page

    // Build query parameters for orders
    const orderParams: any = {
      per_page: 100, // Fetch more to ensure we get all orders including pending
      page: 1,
      orderby: 'date',
      order: 'desc',
    };

    // Set customer filter - only use customer ID (must be integer for WooCommerce API)
    if (customerId) {
      orderParams.customer = customerId; // Must be integer for WooCommerce API
    } else {
      // No customer ID found - we'll fetch orders and filter by billing email
      console.warn('No customer ID found, will filter orders by billing email');
    }

    // Fetch orders via WooCommerce client and JWT in parallel, then merge/dedupe
    const fetches: Promise<any[]>[] = [];

    // WooCommerce client (consumer key/secret)
    fetches.push((async () => {
      try {
        let orders: any[] = [];
        const response = await wcAPI.get('/orders', { params: orderParams });
        orders = response.data || [];

        if (userData.email) {
          const allOrdersParams = { ...orderParams };
          delete allOrdersParams.customer;
          const allOrdersResponse = await wcAPI.get('/orders', { params: allOrdersParams });
          const allOrders = allOrdersResponse.data || [];

          const emailOrders = allOrders.filter((order: any) => {
            const orderCustomerId = toIntCustomerId(order.customer_id);
            return order.billing?.email?.toLowerCase() === userData.email?.toLowerCase() &&
                   (!customerId || orderCustomerId !== customerId);
          });

          const orderMap = new Map();
          [...orders, ...emailOrders].forEach((order: any) => {
            if (!orderMap.has(order.id)) {
              const orderCustomerId = toIntCustomerId(order.customer_id);
              if (
                order.billing?.email?.toLowerCase() === userData.email?.toLowerCase() ||
                (orderCustomerId && orderCustomerId === customerId) ||
                (orderCustomerId && orderCustomerId === toIntCustomerId(userData.id))
              ) {
                orderMap.set(order.id, order);
              }
            }
          });
          orders = Array.from(orderMap.values());
        }

        return orders;
      } catch (wcError: any) {
        console.error('WooCommerce API client error:', {
          status: wcError.response?.status,
          message: wcError.response?.data?.message || wcError.message,
          customerId,
          userEmail: userData.email,
        });
        return [];
      }
    })());

    // JWT fallback
    fetches.push((async () => {
      try {
        const ordersUrl = new URL(`${wpBase}/wp-json/wc/v3/orders`);
        Object.keys(orderParams).forEach(key => {
          ordersUrl.searchParams.set(key, orderParams[key]);
        });

        const ordersResponse = await fetch(ordersUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!ordersResponse.ok) {
          const errorText = await ordersResponse.text();
          console.error('JWT orders fetch failed:', {
            status: ordersResponse.status,
            error: errorText,
          });
          return [];
        }

        let orders = await ordersResponse.json() || [];

        if (userData.email) {
          try {
            const allOrdersUrl = new URL(`${wpBase}/wp-json/wc/v3/orders`);
            const allOrdersParams = { ...orderParams };
            delete allOrdersParams.customer;
            Object.keys(allOrdersParams).forEach(key => {
              allOrdersUrl.searchParams.set(key, allOrdersParams[key]);
            });
            
            const allOrdersResponse = await fetch(allOrdersUrl.toString(), {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            });
            
            if (allOrdersResponse.ok) {
              const allOrders = await allOrdersResponse.json() || [];
              const filteredOrders = allOrders.filter((order: any) => {
                return order.billing?.email?.toLowerCase() === userData.email?.toLowerCase();
              });
              
              const orderMap = new Map();
              const userIdInt = toIntCustomerId(userData.id);
              [...orders, ...filteredOrders].forEach((order: any) => {
                if (!orderMap.has(order.id)) {
                  const orderCustomerId = toIntCustomerId(order.customer_id);
                  if (order.billing?.email?.toLowerCase() === userData.email?.toLowerCase() ||
                      (orderCustomerId && orderCustomerId === customerId) ||
                      (orderCustomerId && orderCustomerId === userIdInt)) {
                    orderMap.set(order.id, order);
                  }
                }
              });
              orders = Array.from(orderMap.values());
            }
          } catch (emailError) {
            console.warn('Failed to fetch orders by email (JWT):', emailError);
          }
        }

        return orders;
      } catch (jwtError: any) {
        console.error('JWT auth error:', jwtError.message);
        return [];
      }
    })());

    // Resolve in parallel and merge/dedupe
    const results = await Promise.all(fetches);
    const mergedMap = new Map<number, any>();
    results.flat().forEach((order: any) => {
      if (order && !mergedMap.has(order.id)) {
        mergedMap.set(order.id, order);
      }
    });

    const mergedOrders = Array.from(mergedMap.values());

    // Sort by date desc
    mergedOrders.sort((a: any, b: any) => {
      const dateA = new Date(a.date_created).getTime();
      const dateB = new Date(b.date_created).getTime();
      return dateB - dateA;
    });

    const total = mergedOrders.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedOrders = mergedOrders.slice(startIndex, endIndex);

    const sanitizedOrders = paginatedOrders.map((order: any) => sanitizeObject(order));

    return NextResponse.json({ 
      orders: sanitizedOrders,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
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


