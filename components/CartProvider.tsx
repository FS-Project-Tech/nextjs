"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calculateSubtotal } from "@/lib/cart-utils";
import type { CartItem } from "@/lib/types/cart";

// Re-export CartItem for backward compatibility
export type { CartItem };

// WooCommerce cart item from API response
interface WCCartItem {
	product_id: number;
	variation_id?: number;
	price: string;
	quantity: number;
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
	total: string; // computed total as display string
}

const CartContext = createContext<CartState | undefined>(undefined);

export default function CartProvider({ children }: { children: React.ReactNode }) {
	const [items, setItems] = useState<CartItem[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [isHydrated, setIsHydrated] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncError, setSyncError] = useState<string | null>(null);

	// hydrate from localStorage - only on client after mount
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
	// Only save to localStorage after hydration to prevent hydration mismatches
	useEffect(() => {
		if (!isHydrated || typeof window === 'undefined') return;
		try {
			localStorage.setItem("cart:v1", JSON.stringify(items));
		} catch {}
	}, [items, isHydrated]);

	const open = useCallback(() => {
		// Only open cart if there are items
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
				next[idx] = { ...next[idx], ...input, qty: next[idx].qty + input.qty, id: next[idx].id };
				return next;
			}
			return [...prev, { ...input, id } as CartItem];
		});
		// Clear sync error when adding items
		setSyncError(null);
		// Open cart after adding item
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

	// Sync cart with WooCommerce API
	const syncWithWooCommerce = useCallback(async (couponCode?: string) => {
		if (items.length === 0) return;
		
		setIsSyncing(true);
		setSyncError(null);
		
		try {
			const response = await fetch('/api/cart/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items, couponCode }),
				credentials: 'include', // Include cookies for session management
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to sync cart');
			}

			const data = await response.json();
			
			// Update prices from WooCommerce response
			if (data.cart?.items) {
				const priceMap = new Map<string, string>();
				(data.cart.items as WCCartItem[]).forEach((wcItem) => {
					const itemId = `${wcItem.product_id}${wcItem.variation_id ? ':' + wcItem.variation_id : ''}`;
					priceMap.set(itemId, wcItem.price);
				});

				// Update items with validated prices
				setItems((prev) =>
					prev.map((item) => {
						const updatedPrice = priceMap.get(item.id);
						return updatedPrice ? { ...item, price: updatedPrice } : item;
					})
				);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to sync cart with WooCommerce';
			console.error('Cart sync error:', error);
			setSyncError(message);
		} finally {
			setIsSyncing(false);
		}
	}, [items]);

	// Validate cart items
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
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Validation failed';
			console.error('Cart validation error:', error);
			return { valid: false, errors: [{ itemId: 'unknown', message }] };
		}
	}, [items]);

	const total = useMemo(() => {
		const sum = calculateSubtotal(items);
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
