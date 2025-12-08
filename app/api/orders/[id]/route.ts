import { NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

/**
 * GET - Fetch order details by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params (Next.js 15+ requires this)
    const resolvedParams = await params;
    const orderId = resolvedParams?.id;

    if (!orderId) {
      console.error("Order API: Missing order ID in params");
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    console.log(`Order API: Fetching order ${orderId}`);

    // Fetch order from WooCommerce
    const { data: order } = await wcAPI.get(`/orders/${orderId}`);

    if (!order) {
      console.error(`Order API: Order ${orderId} not found in WooCommerce`);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    console.log(`Order API: Successfully fetched order ${orderId}`);
    return NextResponse.json({ order });
  } catch (error) {
    // Type assertion for axios-style errors
    const err = error as Error & { 
      response?: { data?: unknown; status?: number }; 
      config?: { params?: unknown };
      stack?: string;
    };
    
    console.error("Order API Error:", {
      message: err.message || 'An error occurred',
      stack: err.stack,
      response: err.response?.data,
      status: err.response?.status,
      params: err.config?.params,
    });
    
    if (err.response?.status === 404) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (err.response?.status === 401 || err.response?.status === 403) {
      return NextResponse.json(
        { error: "Authentication required to view this order" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: err.message || "Failed to fetch order details",
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      },
      { status: err.response?.status || 500 }
    );
  }
}
