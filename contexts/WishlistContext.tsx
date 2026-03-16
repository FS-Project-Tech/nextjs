"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ToastProvider";
import type {
  WishlistContextType,
  WishlistProduct,
} from "@/lib/types/wishlist";

/**
 * Create Wishlist Context
 */
const WishlistContext = createContext<WishlistContextType | null>(null);

/** Cookie for logged-in user wishlist */
const USER_COOKIE_NAME = "wishlist_items";
/** Cookie for guest wishlist */
const GUEST_COOKIE_NAME = "wishlist_items_guest";

/**
 * Get wishlist from cookie
 */
function getWishlistFromCookie(cookieName: string): number[] {
  if (typeof window === "undefined") return [];

  try {
    const cookies = document.cookie.split(";");
    const wishlistCookie = cookies.find((c) =>
      c.trim().startsWith(`${cookieName}=`)
    );

    if (!wishlistCookie) return [];

    const value = wishlistCookie.split("=")[1];
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (id): id is number => typeof id === "number" && id > 0
      );
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Save wishlist to cookie
 */
function saveWishlistToCookie(wishlist: number[], cookieName: string): void {
  if (typeof window === "undefined") return;

  try {
    const value = JSON.stringify(wishlist);
    const encoded = encodeURIComponent(value);

    const expires = new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    ).toUTCString();

    const isSecure = window.location.protocol === "https:";

    document.cookie = `${cookieName}=${encoded}; expires=${expires}; path=/; SameSite=Lax${
      isSecure ? "; Secure" : ""
    }`;
  } catch (error) {
    console.error("Failed to save wishlist to cookie:", error);
  }
}

/**
 * Determine active cookie
 */
function getActiveCookieName(
  isAuthenticated: boolean,
  userId?: number | string
): string {
  if (isAuthenticated && userId) {
    return `${USER_COOKIE_NAME}_${userId}`;
  }

  if (isAuthenticated && !userId) {
    return USER_COOKIE_NAME;
  }

  return GUEST_COOKIE_NAME;
}

interface WishlistProviderProps {
  children: ReactNode;
}

export function WishlistProvider({ children }: WishlistProviderProps) {
  const { isAuthenticated, loading: authLoading, user } = useUser();
  const { success, error: showError } = useToast();

  const [items, setItems] = useState<number[]>([]);
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const prevItemsRef = useRef<number[]>([]);
  const hasLoadedRef = useRef(false);
  const wasAuthenticatedRef = useRef<boolean | undefined>(undefined);

  /**
   * Load wishlist
   */
  const loadWishlist = useCallback(async () => {
    if (!isMounted || hasLoadedRef.current) return;

    hasLoadedRef.current = true;
    setIsLoading(true);

    try {
      if (isAuthenticated) {
        try {
          const res = await fetch("/api/wishlist", {
            credentials: "include",
            cache: "no-store",
          });

          if (res.ok) {
            const data = await res.json();

            const serverItems = (data.wishlist || []).filter(
              (id: unknown): id is number =>
                typeof id === "number" && id > 0
            );

            setItems(serverItems);
            saveWishlistToCookie(
              serverItems,
              getActiveCookieName(true, user?.id)
            );

            return;
          }
        } catch (err) {
          console.error("Wishlist API fallback:", err);
        }
      }

      const cookieName = getActiveCookieName(isAuthenticated, user?.id);
      const cookieItems = getWishlistFromCookie(cookieName);

      setItems(cookieItems);
    } catch (err) {
      console.error("Failed loading wishlist:", err);
      setError("Failed to load wishlist");
    } finally {
      setIsLoading(false);
    }
  }, [isMounted, isAuthenticated, user?.id]);

  /**
   * Load wishlist products
   */
  const loadProducts = useCallback(async () => {
    if (items.length === 0) {
      setProducts([]);
      return;
    }

    setIsLoadingProducts(true);

    try {
      const res = await fetch(
        `/api/products?include=${items.join(",")}&per_page=${items.length}`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        const list = data.products || data || [];

        const ordered = items
          .map((id) => list.find((p: WishlistProduct) => p.id === id))
          .filter((p): p is WishlistProduct => Boolean(p));

        setProducts(ordered);
      }
    } catch (err) {
      console.error("Failed loading wishlist products:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [items]);

  /**
   * Mount
   */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Handle logout
   */
  useEffect(() => {
    if (!isMounted || authLoading) return;

    const wasAuth = wasAuthenticatedRef.current;

    if (wasAuth === true && !isAuthenticated) {
      setItems([]);
      setProducts([]);
    }

    wasAuthenticatedRef.current = isAuthenticated;
  }, [isMounted, authLoading, isAuthenticated]);

  /**
   * Load wishlist
   */
  useEffect(() => {
    if (isMounted && !authLoading) {
      loadWishlist();
    }
  }, [isMounted, authLoading, loadWishlist]);

  /**
   * Load products when items change
   */
  useEffect(() => {
    if (!isMounted) return;

    const prev = prevItemsRef.current.join(",");
    const next = items.join(",");

    if (prev !== next) {
      prevItemsRef.current = items;

      if (items.length > 0) {
        loadProducts();
      } else {
        setProducts([]);
      }
    }
  }, [items, isMounted, loadProducts]);

  /**
   * Fast lookup set
   */
  const itemsSet = useMemo(() => new Set(items), [items]);

  const isInWishlist = useCallback(
    (productId: number) => itemsSet.has(productId),
    [itemsSet]
  );

  /**
   * Add to wishlist
   */
  const addToWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      try {
        if (isAuthenticated) {
          const res = await fetch("/api/wishlist", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });

          if (!res.ok) {
            showError("Failed to add to wishlist");
            return false;
          }

          const data = await res.json();
          const updated = data.wishlist || [];

          setItems(updated);
          saveWishlistToCookie(
            updated,
            getActiveCookieName(true, user?.id)
          );
        } else {
          if (!items.includes(productId)) {
            const updated = [...items, productId];
            setItems(updated);
            saveWishlistToCookie(updated, GUEST_COOKIE_NAME);
          }
        }

        success("Added to wishlist");
        return true;
      } catch {
        showError("Failed to add to wishlist");
        return false;
      }
    },
    [isAuthenticated, items, user?.id, success, showError]
  );

  /**
   * Remove from wishlist
   */
  const removeFromWishlist = useCallback(
    async (productId: number): Promise<boolean> => {
      try {
        if (isAuthenticated) {
          const res = await fetch("/api/wishlist", {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          });

          if (!res.ok) {
            showError("Failed to remove from wishlist");
            return false;
          }

          const data = await res.json();
          const updated = data.wishlist || [];

          setItems(updated);
          saveWishlistToCookie(
            updated,
            getActiveCookieName(true, user?.id)
          );
        } else {
          const updated = items.filter((id) => id !== productId);
          setItems(updated);
          saveWishlistToCookie(updated, GUEST_COOKIE_NAME);
        }

        setProducts((prev) => prev.filter((p) => p.id !== productId));

        success("Removed from wishlist");
        return true;
      } catch {
        showError("Failed to remove from wishlist");
        return false;
      }
    },
    [isAuthenticated, items, user?.id, success, showError]
  );

  /**
   * Context value
   */
  const value = useMemo<WishlistContextType>(
    () => ({
      items: isMounted ? items : [],
      products: isMounted ? products : [],
      isLoading,
      isLoadingProducts,
      error,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      refreshWishlist: loadWishlist,
      clearWishlist: () => setItems([]),
    }),
    [
      isMounted,
      items,
      products,
      isLoading,
      isLoadingProducts,
      error,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      loadWishlist,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

/**
 * Hook
 */
export function useWishlist(): WishlistContextType {
  const ctx = useContext(WishlistContext);

  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }

  return ctx;
}

export default WishlistProvider;