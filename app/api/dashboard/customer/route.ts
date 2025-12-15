import { NextRequest, NextResponse } from 'next/server';
import { getWpBaseUrl } from '@/lib/auth';
import { getAuthToken } from '@/lib/auth-server';

/**
 * GET /api/dashboard/customer
 * Fetch customer stats and information using the Headless Woo API Gateway
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

    // Initialize stats
    let ordersCount = 0;
    let totalSpent = '0';
    let currency = 'AUD';

    // Fetch all orders using the API Gateway endpoint
    // Fetch multiple pages to get all orders for accurate stats calculation
    try {
      let allOrders: any[] = [];
      let page = 1;
      const perPage = 100; // Gateway max per_page is 100
      let hasMorePages = true;
      let totalFromHeaders = 0;

      // Fetch all pages of orders
      while (hasMorePages && page <= 10) { // Limit to 10 pages (1000 orders max)
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

        if (ordersResponse.ok) {
          const orders = await ordersResponse.json() || [];
          
          // Get total from headers on first page
          if (page === 1) {
            totalFromHeaders = parseInt(ordersResponse.headers.get('X-WP-Total') || '0');
          }
          
          if (Array.isArray(orders) && orders.length > 0) {
            allOrders = [...allOrders, ...orders];
            
            // Check if there are more pages
            const totalPages = parseInt(ordersResponse.headers.get('X-WP-TotalPages') || '1');
            hasMorePages = page < totalPages;
            page++;
          } else {
            hasMorePages = false;
          }
        } else {
          const errorText = await ordersResponse.text();
          console.error('Gateway orders fetch failed for stats:', {
            status: ordersResponse.status,
            error: errorText,
          });
          hasMorePages = false;
        }
      }

      if (allOrders.length > 0) {
        // Use total from headers if available, otherwise use count of fetched orders
        ordersCount = totalFromHeaders > 0 ? totalFromHeaders : allOrders.length;
        
        // Calculate total spent from orders with status "completed" or "processing"
        const completedOrders = allOrders.filter((order: any) => {
          const status = (order.status || '').toLowerCase();
          return status === 'completed' || status === 'processing';
        });
        
        totalSpent = completedOrders
          .reduce((sum: number, order: any) => {
            return sum + parseFloat(order.total || 0);
          }, 0).toFixed(2);
        
        // Get currency from first order if available
        if (allOrders[0].currency) {
          currency = allOrders[0].currency;
        }
      }
    } catch (error) {
      console.error('Error fetching orders for stats:', error instanceof Error ? error.message : 'Unknown error');
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