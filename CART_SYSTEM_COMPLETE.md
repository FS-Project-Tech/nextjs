# ✅ Complete Cart System Implementation

## Overview

Your cart system is **fully implemented** using **Context API** with WooCommerce REST API integration. All components are in place and integrated into your app.

---

## 📦 Implementation Status

✅ **CartProvider** - Context API with localStorage  
✅ **API Routes** - WooCommerce sync endpoints  
✅ **MiniCartDrawer** - Slide-out cart drawer  
✅ **Cart Page** - Full cart view at `/cart`  
✅ **Integration** - Already in `app/layout.tsx`  

---

## 1. Cart Context (Context API)

**File:** `components/CartProvider.tsx`

```typescript
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export interface CartItem {
  id: string; // productId or productId:variationId
  productId: number;
  variationId?: number;
  name: string;
  slug: string;
  imageUrl?: string;
  price: string; // display price string
  qty: number;
  sku?: string | null;
  attributes?: { [name: string]: string };
  deliveryPlan?: "none" | "7" | "14" | "30";
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isSyncing: boolean;
  syncError: string | null;
  open: () => void;
  close: () => void;
  addItem: (item: Omit<CartItem, "id"> & { id?: string }) => void;
  removeItem: (id: string) => void;
  updateItemQty: (id: string, qty: number) => void;
  clear: () => void;
  syncWithWooCommerce: (couponCode?: string) => Promise<void>;
  validateCart: () => Promise<{ valid: boolean; errors: Array<{ itemId: string; message: string }> }>;
  total: string;
}

const CartContext = createContext<CartState | undefined>(undefined);

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem("cart:v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
        setIsHydrated(true);
      }
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem("cart:v1", JSON.stringify(items));
    } catch {}
  }, [items, isHydrated]);

  const open = useCallback(() => {
    if (items.length > 0) {
      setIsOpen(true);
    }
  }, [items.length]);

  const close = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((input: Omit<CartItem, "id"> & { id?: string }) => {
    const id = input.id || `${input.productId}${input.variationId ? ":" + input.variationId : ""}`;
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + input.qty };
        return next;
      }
      return [...prev, { ...input, id } as CartItem];
    });
    setSyncError(null);
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateItemQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setSyncError(null);
  }, []);

  // Sync with WooCommerce
  const syncWithWooCommerce = useCallback(async (couponCode?: string) => {
    if (items.length === 0) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const response = await fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, couponCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync cart');
      }

      const data = await response.json();
      
      // Update prices from WooCommerce
      if (data.cart?.items) {
        const priceMap = new Map<string, string>();
        data.cart.items.forEach((wcItem: any) => {
          const itemId = `${wcItem.product_id}${wcItem.variation_id ? ':' + wcItem.variation_id : ''}`;
          priceMap.set(itemId, wcItem.price);
        });

        setItems((prev) =>
          prev.map((item) => {
            const updatedPrice = priceMap.get(item.id);
            return updatedPrice ? { ...item, price: updatedPrice } : item;
          })
        );
      }
    } catch (error: any) {
      console.error('Cart sync error:', error);
      setSyncError(error.message || 'Failed to sync cart with WooCommerce');
    } finally {
      setIsSyncing(false);
    }
  }, [items]);

  // Validate cart
  const validateCart = useCallback(async () => {
    if (items.length === 0) {
      return { valid: true, errors: [] };
    }

    try {
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        return { valid: false, errors: [{ itemId: 'unknown', message: 'Validation failed' }] };
      }

      const data = await response.json();
      return { valid: data.valid, errors: data.errors || [] };
    } catch (error: any) {
      console.error('Cart validation error:', error);
      return { valid: false, errors: [{ itemId: 'unknown', message: error.message || 'Validation failed' }] };
    }
  }, [items]);

  const total = useMemo(() => {
    const sum = items.reduce((acc, it) => acc + parseFloat(it.price || "0") * it.qty, 0);
    return sum.toFixed(2);
  }, [items]);

  const value: CartState = useMemo(() => ({
    items,
    isOpen,
    isSyncing,
    syncError,
    open,
    close,
    addItem,
    removeItem,
    updateItemQty,
    clear,
    syncWithWooCommerce,
    validateCart,
    total: total
  }), [items, isOpen, isSyncing, syncError, open, close, addItem, removeItem, updateItemQty, clear, syncWithWooCommerce, validateCart, total]);

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
```

---

## 2. API Routes

### A. Sync Cart (`app/api/cart/sync/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { syncCartToWooCommerce, validateCartItems } from "@/lib/cart-sync";
import type { CartItem } from "@/components/CartProvider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, couponCode } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid items array" },
        { status: 400 }
      );
    }

    // Validate first
    const validation = await validateCartItems(items as CartItem[]);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Cart validation failed",
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Sync with WooCommerce
    const cartData = await syncCartToWooCommerce(items as CartItem[], couponCode);

    if (!cartData) {
      return NextResponse.json(
        { error: "Failed to sync cart" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      cart: cartData,
    });
  } catch (error: any) {
    console.error("Cart sync error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to sync cart",
      },
      { status: 500 }
    );
  }
}
```

### B. Validate Cart (`app/api/cart/validate/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { validateCartItems } from "@/lib/cart-sync";
import type { CartItem } from "@/components/CartProvider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid items array" },
        { status: 400 }
      );
    }

    const validation = await validateCartItems(items as CartItem[]);

    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
    });
  } catch (error: any) {
    console.error("Cart validation error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to validate cart",
        valid: false,
        errors: [],
      },
      { status: 500 }
    );
  }
}
```

### C. Update Prices (`app/api/cart/prices/route.ts`)

```typescript
import { NextResponse } from "next/server";
import { updateCartPrices } from "@/lib/cart-sync";
import type { CartItem } from "@/components/CartProvider";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid items array" },
        { status: 400 }
      );
    }

    const priceMap = await updateCartPrices(items as CartItem[]);

    const prices: Record<string, string> = {};
    priceMap.forEach((price, id) => {
      prices[id] = price;
    });

    return NextResponse.json({
      success: true,
      prices,
    });
  } catch (error: any) {
    console.error("Price update error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to update prices",
      },
      { status: 500 }
    );
  }
}
```

---

## 3. Usage Examples

### Add Item to Cart

```typescript
import { useCart } from '@/components/CartProvider';

function ProductCard({ product }) {
  const { addItem, open } = useCart();
  
  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      qty: 1,
      imageUrl: product.images?.[0]?.src,
      sku: product.sku,
    });
    // Cart opens automatically
  };
  
  return (
    <button onClick={handleAddToCart}>
      Add to Cart
    </button>
  );
}
```

### Sync Before Checkout

```typescript
import { useCart } from '@/components/CartProvider';
import { useRouter } from 'next/navigation';

function CheckoutButton() {
  const { syncWithWooCommerce, isSyncing, syncError } = useCart();
  const router = useRouter();
  
  const handleCheckout = async () => {
    // Sync cart with WooCommerce first
    await syncWithWooCommerce();
    
    if (!syncError) {
      router.push('/checkout');
    }
  };
  
  return (
    <div>
      {syncError && (
        <div className="error">{syncError}</div>
      )}
      <button 
        onClick={handleCheckout}
        disabled={isSyncing}
      >
        {isSyncing ? 'Syncing...' : 'Checkout'}
      </button>
    </div>
  );
}
```

### Validate Cart

```typescript
import { useCart } from '@/components/CartProvider';
import { useEffect, useState } from 'react';

function CartPage() {
  const { items, validateCart } = useCart();
  const [errors, setErrors] = useState([]);
  
  useEffect(() => {
    const validate = async () => {
      const result = await validateCart();
      setErrors(result.errors);
    };
    
    if (items.length > 0) {
      validate();
    }
  }, [items, validateCart]);
  
  return (
    <div>
      {errors.length > 0 && (
        <div className="alert">
          {errors.map(error => (
            <div key={error.itemId}>{error.message}</div>
          ))}
        </div>
      )}
      {/* Cart items */}
    </div>
  );
}
```

### Update Quantity

```typescript
import { useCart } from '@/components/CartProvider';

function CartItem({ item }) {
  const { updateItemQty, removeItem } = useCart();
  
  return (
    <div>
      <input
        type="number"
        min="1"
        value={item.qty}
        onChange={(e) => updateItemQty(item.id, parseInt(e.target.value) || 1)}
      />
      <button onClick={() => removeItem(item.id)}>
        Remove
      </button>
    </div>
  );
}
```

---

## 4. Integration Status

✅ **CartProvider** is already in `app/layout.tsx`:
```typescript
<CartProvider>
  <CheckoutProvider>
    <Header />
    <MiniCartDrawer />
    {children}
  </CheckoutProvider>
</CartProvider>
```

✅ **MiniCartDrawer** is already integrated and opens when items are added

✅ **Cart Page** exists at `/app/cart/page.tsx`

---

## 5. Cart State API

```typescript
const {
  // State
  items,              // CartItem[] - All cart items
  isOpen,             // boolean - Mini cart drawer open state
  isSyncing,          // boolean - Sync in progress
  syncError,          // string | null - Last sync error
  total,              // string - Calculated total
  
  // Actions
  addItem,            // (item) => void - Add/update item
  removeItem,         // (id) => void - Remove item
  updateItemQty,      // (id, qty) => void - Update quantity
  clear,              // () => void - Clear all items
  syncWithWooCommerce,// (couponCode?) => Promise<void>
  validateCart,       // () => Promise<{valid, errors}>
  open,               // () => void - Open mini cart
  close,              // () => void - Close mini cart
} = useCart();
```

---

## 6. localStorage Structure

Cart is stored in `localStorage` with key `"cart:v1"`:

```json
[
  {
    "id": "123:456",
    "productId": 123,
    "variationId": 456,
    "name": "Product Name",
    "slug": "product-name",
    "price": "99.99",
    "qty": 2,
    "imageUrl": "https://...",
    "sku": "SKU123"
  }
]
```

---

## 7. WooCommerce Sync Flow

1. **User adds item** → Stored in localStorage
2. **Before checkout** → Call `syncWithWooCommerce()`
3. **WooCommerce validates**:
   - Stock availability
   - Current prices
   - Product availability
4. **Prices updated** → Cart reflects WooCommerce prices
5. **Proceed to checkout** → Use validated cart data

---

## ✅ Everything is Ready!

Your cart system is **fully implemented** and **integrated**. You can:

1. ✅ Add items to cart from product pages
2. ✅ View cart in mini drawer or full page
3. ✅ Sync with WooCommerce for price validation
4. ✅ Validate stock before checkout
5. ✅ Persist cart across sessions

**No additional setup needed!** 🎉

