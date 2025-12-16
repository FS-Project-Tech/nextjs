/**
 * Cart Sync with WooCommerce
 * Real-time synchronization of cart data between Next.js and WooCommerce
 */

import wcAPI from './woocommerce';
import type { CartItem } from '@/lib/types/cart';

export interface WooCommerceCartItem {
  id: string;
  product_id: number;
  variation_id?: number;
  quantity: number;
  name: string;
  price: string;
  sku?: string;
  image?: { src: string; alt: string };
  stock_status?: string;
  stock_quantity?: number | null;
}

export interface WooCommerceCartData {
  items: WooCommerceCartItem[];
  subtotal: string;
  total: string;
  tax_total: string;
  shipping_total: string;
  discount_total: string;
  coupon_lines?: Array<{ code: string; discount: string }>;
}

/**
 * Sync cart items to WooCommerce and get validated prices/totals
 * This ensures cart data matches WooCommerce backend exactly
 */
export async function syncCartToWooCommerce(
  items: CartItem[],
  couponCode?: string
): Promise<WooCommerceCartData | null> {
  try {
    // Prepare line items for WooCommerce cart validation
    const lineItems = items.map((item) => ({
      product_id: item.productId,
      variation_id: item.variationId || undefined,
      quantity: item.qty,
    }));

    // Use WooCommerce cart endpoint to validate and calculate totals
    // Note: WooCommerce doesn't have a native cart API, so we'll use order preview
    const orderData: any = {
      line_items: lineItems,
      ...(couponCode ? { coupon_lines: [{ code: couponCode }] } : {}),
      set_paid: false,
    };

    // Create a pending order to get accurate totals
    // This validates stock, prices, and calculates taxes/shipping
    // We'll delete it immediately after getting the data
    const response = await wcAPI.post('/orders', orderData);

    const order = response.data;

    // Extract cart data from order
    const cartData: WooCommerceCartData = {
      items: (order.line_items || []).map((item: any) => ({
        id: `${item.product_id}${item.variation_id ? ':' + item.variation_id : ''}`,
        product_id: item.product_id,
        variation_id: item.variation_id || undefined,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        sku: item.sku,
        image: item.image || undefined,
        stock_status: item.stock_status,
        stock_quantity: item.stock_quantity,
      })),
      subtotal: order.total_line_items_price || '0',
      total: order.total || '0',
      tax_total: order.total_tax || '0',
      shipping_total: order.total_shipping || '0',
      discount_total: order.total_discount || '0',
      coupon_lines: order.coupon_lines || [],
    };

    // Delete the draft order (cleanup)
    try {
      await wcAPI.delete(`/orders/${order.id}`, { params: { force: true } });
    } catch (deleteError) {
      console.warn('Failed to delete draft order:', deleteError);
      // Continue - draft orders don't affect inventory
    }

    return cartData;
  } catch (error) {
    console.error('Cart sync error:', error);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/85fce644-efa2-4bb9-867e-84b2679df9a3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'cart-sync-run1',
        hypothesisId: 'H-cart-1',
        location: 'cart-sync.ts:94',
        message: 'Cart sync error caught',
        data: {
          hasResponse: typeof error === 'object' && error !== null && 'response' in error,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    // Return error details for frontend handling (Axios-style errors)
    if (
      typeof error === 'object' &&
      error !== null &&
      'response' in error &&
      (error as any).response?.data
    ) {
      const respData = (error as any).response.data;
      throw new Error(
        respData.message ||
          respData.code ||
          'Cart sync failed'
      );
    }

    // Fallback: ensure we always throw an Error instance
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Validate cart item availability and stock
 * Check if items are still in stock and available
 */
export async function validateCartItems(
  items: CartItem[]
): Promise<{ valid: boolean; errors: Array<{ itemId: string; message: string }> }> {
  const errors: Array<{ itemId: string; message: string }> = [];

  try {
    // Check each item's stock status
    for (const item of items) {
      try {
        const productId = item.variationId || item.productId;
        const endpoint = item.variationId
          ? `/products/${item.productId}/variations/${item.variationId}`
          : `/products/${item.productId}`;

        const response = await wcAPI.get(endpoint);
        const product = response.data;

        // Check stock status
        if (product.stock_status === 'outofstock') {
          errors.push({
            itemId: item.id,
            message: `${item.name} is out of stock`,
          });
        } else if (product.manage_stock && product.stock_quantity !== null) {
          if (product.stock_quantity < item.qty) {
            const available = product.backorders_allowed
              ? `${item.name} (only ${product.stock_quantity} available, backorders allowed)`
              : `${item.name} (only ${product.stock_quantity} available)`;
            
            errors.push({
              itemId: item.id,
              message: available,
            });
          }
        }
      } catch (itemError: any) {
        errors.push({
          itemId: item.id,
          message: `Unable to validate ${item.name}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Cart validation error:', error);
    return {
      valid: false,
      errors: [{ itemId: 'unknown', message: 'Validation failed' }],
    };
  }
}

/**
 * Update cart item prices from WooCommerce
 * Ensures prices are always current
 */
export async function updateCartPrices(
  items: CartItem[]
): Promise<Map<string, string>> {
  const priceMap = new Map<string, string>();

  try {
    await Promise.all(
      items.map(async (item) => {
        try {
          const productId = item.variationId || item.productId;
          const endpoint = item.variationId
            ? `/products/${item.productId}/variations/${item.variationId}`
            : `/products/${item.productId}`;

          const response = await wcAPI.get(endpoint, {
            params: { _fields: 'id,price,regular_price,sale_price,on_sale' },
          });
          const product = response.data;

          const price = product.on_sale && product.sale_price
            ? product.sale_price
            : product.price || product.regular_price;

          priceMap.set(item.id, price);
        } catch (error) {
          console.warn(`Failed to fetch price for item ${item.id}:`, error);
          // Keep existing price on error
          priceMap.set(item.id, item.price);
        }
      })
    );
  } catch (error) {
    console.error('Price update error:', error);
  }

  return priceMap;
}

