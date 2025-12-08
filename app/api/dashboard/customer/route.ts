import { NextRequest, NextResponse } from 'next/server';
import { getWpBaseUrl } from '@/lib/auth';
import { getAuthToken } from '@/lib/auth-server';
import wcAPI from '@/lib/woocommerce';
import { getCustomerIdWithFallback, getCustomerData, toIntCustomerId } from '@/lib/customer-utils';

/**
 * GET /api/dashboard/customer
 * Fetch customer stats and information
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const wpBase = getWpBaseUrl();
    if (!wpBase) {
      return NextResponse.json(
        { error: 'WordPress URL not configured' },
        { status: 500 }
      );
    }

    // Get user data
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

    const user = await userResponse.json();

    // Get WooCommerce customer data using optimized hybrid approach
    let customerId: number | null = null;
    let ordersCount = 0;
    let totalSpent = '0';
    let currency = 'AUD';

    try {
      // Use optimized customer retrieval (cached -> session -> email)
      const customer = await getCustomerData(user.email, token);
      
      if (customer) {
        customerId = toIntCustomerId(customer.id);
        ordersCount = customer.orders_count || 0;
        totalSpent = customer.total_spent || '0';
        currency = customer.currency || 'AUD';
      } else {
        // If customer data not found, try to get just the ID
        customerId = await getCustomerIdWithFallback(user.email, token);
      }
    } catch (error) {
      console.error('Error fetching customer data:', (error instanceof Error ? error.message : 'An error occurred'));
      // Continue to try fetching orders directly
    }

    // Fetch actual orders to get accurate count and total
    try {
      const orderParams: any = {
        per_page: 100,
        orderby: 'date',
        order: 'desc',
      };

      // Set customer filter - only use customer ID (must be integer for WooCommerce API)
      // If no customer ID, we'll fetch orders and filter by billing email
      if (customerId) {
        orderParams.customer = customerId; // Must be integer for WooCommerce API
      }

      // Method 1: Try using WooCommerce API client
      try {
        let orders: any[] = [];
        
        if (customerId) {
          // Fetch orders by customer ID
          const ordersResponse = await wcAPI.get('/orders', { params: orderParams });
          orders = ordersResponse.data || [];
        }
        
        // If no customer ID or we want to catch guest orders, also fetch by billing email
        if (!customerId && user.email) {
          // Fetch orders without customer filter and filter by billing email
          const allOrdersParams = { ...orderParams };
          delete allOrdersParams.customer;
          const allOrdersResponse = await wcAPI.get('/orders', { params: allOrdersParams });
          const allOrders = allOrdersResponse.data || [];
          orders = allOrders.filter((order: any) => {
            return order.billing?.email?.toLowerCase() === user.email?.toLowerCase();
          });
        } else if (customerId && user.email) {
          // Also fetch orders by billing email for guest orders
          const allOrdersParams = { ...orderParams };
          delete allOrdersParams.customer;
          const allOrdersResponse = await wcAPI.get('/orders', { params: allOrdersParams });
          const allOrders = allOrdersResponse.data || [];
          const emailOrders = allOrders.filter((order: any) => {
            const orderCustomerId = toIntCustomerId(order.customer_id);
            return order.billing?.email?.toLowerCase() === user.email?.toLowerCase() &&
                   (!orderCustomerId || orderCustomerId !== customerId);
          });
          // Combine and deduplicate
          const orderMap = new Map();
          [...orders, ...emailOrders].forEach((order: any) => {
            if (!orderMap.has(order.id)) {
              orderMap.set(order.id, order);
            }
          });
          orders = Array.from(orderMap.values());
        }
        
        if (Array.isArray(orders) && orders.length > 0) {
          ordersCount = orders.length;
          // Calculate total spent from orders with status "completed" or "processing"
          totalSpent = orders
            .filter((order: any) => {
              const status = (order.status || '').toLowerCase();
              return status === 'completed' || status === 'processing';
            })
            .reduce((sum: number, order: any) => {
              return sum + parseFloat(order.total || 0);
            }, 0).toFixed(2);
          // Get currency from first order if available
          if (orders[0].currency) {
            currency = orders[0].currency;
          }
        }
      } catch (wcError: any) {
        console.error('WooCommerce API client error for orders:', {
          status: wcError.response?.status,
          message: wcError.response?.data?.message || wcError.message,
        });

        // Method 2: Fallback to JWT token
        try {
          let orders: any[] = [];
          
          if (customerId) {
            // Fetch orders by customer ID
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
              orders = await ordersResponse.json() || [];
            }
          }
          
          // If no customer ID or we want to catch guest orders, also fetch by billing email
          if (!customerId && user.email) {
            // Fetch orders without customer filter and filter by billing email
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
              orders = allOrders.filter((order: any) => {
                return order.billing?.email?.toLowerCase() === user.email?.toLowerCase();
              });
            }
          } else if (customerId && user.email) {
            // Also fetch orders by billing email for guest orders
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
              const emailOrders = allOrders.filter((order: any) => {
                const orderCustomerId = toIntCustomerId(order.customer_id);
                return order.billing?.email?.toLowerCase() === user.email?.toLowerCase() &&
                       (!orderCustomerId || orderCustomerId !== customerId);
              });
              // Combine and deduplicate
              const orderMap = new Map();
              [...orders, ...emailOrders].forEach((order: any) => {
                if (!orderMap.has(order.id)) {
                  orderMap.set(order.id, order);
                }
              });
              orders = Array.from(orderMap.values());
            }
          }

          if (Array.isArray(orders) && orders.length > 0) {
            ordersCount = orders.length;
            // Calculate total spent from orders with status "completed" or "processing"
            totalSpent = orders
              .filter((order: any) => {
                const status = (order.status || '').toLowerCase();
                return status === 'completed' || status === 'processing';
              })
              .reduce((sum: number, order: any) => {
                return sum + parseFloat(order.total || 0);
              }, 0).toFixed(2);
            if (orders[0].currency) {
              currency = orders[0].currency;
            }
          }
        } catch (jwtError: any) {
          console.error('JWT auth error for orders:', jwtError.message);
        }
      }
    } catch (error) {
      console.error('Error fetching orders for count:', error instanceof Error ? error.message : 'Unknown error');
    }

    return NextResponse.json({
      orders_count: ordersCount,
      total_spent: totalSpent,
      currency: currency,
      date_created: user.date || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Customer API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching customer data' },
      { status: 500 }
    );
  }
}


