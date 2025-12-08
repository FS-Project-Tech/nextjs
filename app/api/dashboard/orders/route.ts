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

    // Get user data to get customer ID
    const userResponse = await fetch(`${wpBase}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user data' },
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

    // Method 1: Try using WooCommerce API client (with consumer key/secret)
    try {
      // Fetch orders by customer ID/email
      const response = await wcAPI.get('/orders', { params: orderParams });
      let orders = response.data || [];
      
      // If no customer ID, fetch all orders and filter by billing email
      // Also fetch orders by billing email to catch pending/guest orders
      if (!customerId && userData.email) {
        try {
          // Fetch orders without customer filter and filter by billing email
          const allOrdersParams = {
            ...orderParams,
            // Remove customer parameter if it doesn't exist
          };
          delete allOrdersParams.customer;
          
          const allOrdersResponse = await wcAPI.get('/orders', { params: allOrdersParams });
          const allOrders = allOrdersResponse.data || [];
          
          // Filter orders by billing email
          const filteredOrders = allOrders.filter((order: any) => {
            return order.billing?.email?.toLowerCase() === userData.email?.toLowerCase();
          });
          
          // Combine and deduplicate orders by ID
          const orderMap = new Map();
          const userIdInt = toIntCustomerId(userData.id);
          [...orders, ...filteredOrders].forEach((order: any) => {
            if (!orderMap.has(order.id)) {
              // Verify order belongs to user by checking billing email or customer ID
              const orderCustomerId = toIntCustomerId(order.customer_id);
              if (order.billing?.email?.toLowerCase() === userData.email?.toLowerCase() ||
                  (orderCustomerId && orderCustomerId === customerId) ||
                  (orderCustomerId && orderCustomerId === userIdInt)) {
                orderMap.set(order.id, order);
              }
            }
          });
          orders = Array.from(orderMap.values());
        } catch (emailError) {
          console.warn('Failed to fetch orders by email:', emailError);
          // Continue with customer ID results (or empty if no customer ID)
        }
      } else if (customerId && userData.email) {
        // If we have customer ID, also try to fetch by billing email for guest orders
        try {
          const allOrdersParams = {
            ...orderParams,
          };
          delete allOrdersParams.customer;
          
          const allOrdersResponse = await wcAPI.get('/orders', { params: allOrdersParams });
          const allOrders = allOrdersResponse.data || [];
          
          // Filter orders by billing email that don't have customer ID
          const emailOrders = allOrders.filter((order: any) => {
            const orderCustomerId = toIntCustomerId(order.customer_id);
            return order.billing?.email?.toLowerCase() === userData.email?.toLowerCase() &&
                   (!orderCustomerId || orderCustomerId !== customerId);
          });
          
          // Combine and deduplicate
          const orderMap = new Map();
          const userIdInt = toIntCustomerId(userData.id);
          [...orders, ...emailOrders].forEach((order: any) => {
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
        } catch (emailError) {
          console.warn('Failed to fetch additional orders by email:', emailError);
        }
      }
      
      // Sort orders by date (newest first)
      orders.sort((a: any, b: any) => {
        const dateA = new Date(a.date_created).getTime();
        const dateB = new Date(b.date_created).getTime();
        return dateB - dateA;
      });
      
      // Apply pagination manually since we fetched all orders
      const total = orders.length;
      const totalPages = Math.ceil(total / perPage);
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedOrders = orders.slice(startIndex, endIndex);
      
      // Sanitize orders data
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
    } catch (wcError: any) {
      console.error('WooCommerce API client error:', {
        status: wcError.response?.status,
        message: wcError.response?.data?.message || wcError.message,
        customerId,
        userEmail: userData.email,
      });

      // Method 2: Try with JWT token as fallback
      try {
        // Fetch orders by customer ID/email
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

        if (ordersResponse.ok) {
          let orders = await ordersResponse.json() || [];
          
          // If no customer ID, fetch all orders and filter by billing email
          // Also fetch orders by billing email to catch pending/guest orders
          if (!customerId && userData.email) {
            try {
              // Fetch orders without customer filter
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
                // Filter by billing email
                const filteredOrders = allOrders.filter((order: any) => {
                  return order.billing?.email?.toLowerCase() === userData.email?.toLowerCase();
                });
                
                // Combine and deduplicate orders by ID
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
          } else if (customerId && userData.email) {
            // If we have customer ID, also fetch orders by billing email for guest orders
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
                // Filter orders by billing email that don't have customer ID
                const emailOrders = allOrders.filter((order: any) => {
                  const orderCustomerId = toIntCustomerId(order.customer_id);
                  return order.billing?.email?.toLowerCase() === userData.email?.toLowerCase() &&
                         (!orderCustomerId || orderCustomerId !== customerId);
                });
                
                // Combine and deduplicate
                const orderMap = new Map();
                const userIdInt = toIntCustomerId(userData.id);
                [...orders, ...emailOrders].forEach((order: any) => {
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
              console.warn('Failed to fetch additional orders by email (JWT):', emailError);
            }
          }
          
          // Sort orders by date (newest first)
          orders.sort((a: any, b: any) => {
            const dateA = new Date(a.date_created).getTime();
            const dateB = new Date(b.date_created).getTime();
            return dateB - dateA;
          });
          
          // Apply pagination manually
          const total = orders.length;
          const totalPages = Math.ceil(total / perPage);
          const startIndex = (page - 1) * perPage;
          const endIndex = startIndex + perPage;
          const paginatedOrders = orders.slice(startIndex, endIndex);
          
          // Sanitize orders data
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
        } else {
          const errorText = await ordersResponse.text();
          console.error('JWT auth failed:', {
            status: ordersResponse.status,
            error: errorText,
          });
        }
      } catch (jwtError: any) {
        console.error('JWT auth error:', jwtError.message);
      }
    }

    // If all methods failed, return empty array with pagination
    return NextResponse.json({ 
      orders: [],
      pagination: {
        page,
        per_page: perPage,
        total: 0,
        total_pages: 0,
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


