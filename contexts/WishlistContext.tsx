"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ToastProvider';
import type {
  WishlistContextType,
  WishlistProduct,
  WISHLIST_COOKIE_NAME,
} from '@/lib/types/wishlist';

/**
 * Create Wishlist Context
 */
const WishlistContext = createContext<WishlistContextType | null>(null);

/**
 * Cookie name for client-side access
 */
const COOKIE_NAME = 'wishlist_items';

/**
 * Get wishlist from cookie (client-side)
 */
function getWishlistFromCookie(): number[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const cookies = document.cookie.split(';');
    const wishlistCookie = cookies.find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
    
    if (!wishlistCookie) return [];
    
    const value = wishlistCookie.split('=')[1];
    if (!value) return [];
    
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded);
    
    if (Array.isArray(parsed)) {
      return parsed.filter((id): id is number => typeof id === 'number' && id > 0);
    }
    
    return [];
  } catch {
    return [];
  }
}

/**
 * Save wishlist to cookie (client-side optimistic update)
 */
function saveWishlistToCookie(wishlist: number[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const value = JSON.stringify(wishlist);
    const encoded = encodeURIComponent(value);
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    const isSecure = window.location.protocol === 'https:';
    
    document.cookie = `${COOKIE_NAME}=${encoded}; expires=${expires}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
  } catch (error) {
    console.error('Failed to save wishlist to cookie:', error);
  }
}

/**
 * WishlistProvider Props
 */
interface WishlistProviderProps {
  children: ReactNode;
}

/**
 * WishlistProvider Component
 * Manages wishlist state with authentication awareness
 */
export function WishlistProvider({ children }: WishlistProviderProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error: showError } = useToast();
  
  // State
  const [items, setItems] = useState<number[]>([]);
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Load wishlist from API or cookie
   */
  const loadWishlist = useCallback(async () => {
    if (!isMounted) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // First, get from cookie for instant display
      const cookieItems = getWishlistFromCookie();
      setItems(cookieItems);
      
      // Then sync with server if authenticated
      if (isAuthenticated) {
        const response = await fetch('/api/wishlist', {
          credentials: 'include',
          cache: 'no-store',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.wishlist)) {
            setItems(data.wishlist);
            // Sync cookie with server data
            saveWishlistToCookie(data.wishlist);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load wishlist:', err);
      setError('Failed to load wishlist');
    } finally {
      setIsLoading(false);
    }
  }, [isMounted, isAuthenticated]);

  /**
   * Load product details for wishlist items
   */
  const loadProducts = useCallback(async () => {
    if (items.length === 0) {
      setProducts([]);
      return;
    }
    
    setIsLoadingProducts(true);
    
    try {
      const response = await fetch(
        `/api/products?include=${items.join(',')}&per_page=${items.length}`,
        { cache: 'no-store' }
      );
      
      if (response.ok) {
        const data = await response.json();
        const productsList = data.products || data || [];
        
        if (Array.isArray(productsList)) {
          // Filter to only include products in wishlist and maintain order
          const filtered = items
            .map(id => productsList.find((p: WishlistProduct) => p.id === id))
            .filter((p): p is WishlistProduct => p !== undefined);
          
          setProducts(filtered);
        }
      }
    } catch (err) {
      console.error('Failed to load wishlist products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [items]);

  // Initialize on mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load wishlist when mounted or auth state changes
  useEffect(() => {
    if (isMounted && !authLoading) {
      loadWishlist();
    }
  }, [isMounted, authLoading, isAuthenticated, loadWishlist]);

  // Load products when items change
  useEffect(() => {
    if (isMounted && items.length > 0) {
      loadProducts();
    } else if (isMounted) {
      setProducts([]);
    }
  }, [items, isMounted, loadProducts]);

  /**
   * Check if product is in wishlist
   */
  const isInWishlist = useCallback((productId: number): boolean => {
    return items.includes(productId);
  }, [items]);

  /**
   * Add product to wishlist
   */
  const addToWishlist = useCallback(async (productId: number): Promise<boolean> => {
    // Check authentication
    if (!isAuthenticated) {
      // Redirect to login
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      window.location.href = `/login?next=${encodeURIComponent(currentPath)}&action=wishlist`;
      return false;
    }
    
    // Optimistic update
    if (!items.includes(productId)) {
      const updatedItems = [...items, productId];
      setItems(updatedItems);
      saveWishlistToCookie(updatedItems);
    }
    
    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Revert optimistic update
        setItems(items);
        saveWishlistToCookie(items);
        
        if (data.requiresAuth) {
          const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
          window.location.href = `/login?next=${encodeURIComponent(currentPath)}&action=wishlist`;
          return false;
        }
        
        showError(data.error || 'Failed to add to wishlist');
        return false;
      }
      
      // Update with server response
      if (data.wishlist) {
        setItems(data.wishlist);
        saveWishlistToCookie(data.wishlist);
      }
      
      success('Added to wishlist');
      return true;
    } catch (err) {
      // Revert optimistic update
      setItems(items);
      saveWishlistToCookie(items);
      
      console.error('Add to wishlist error:', err);
      showError('Failed to add to wishlist');
      return false;
    }
  }, [items, isAuthenticated, success, showError]);

  /**
   * Remove product from wishlist
   */
  const removeFromWishlist = useCallback(async (productId: number): Promise<boolean> => {
    // Optimistic update
    const updatedItems = items.filter(id => id !== productId);
    const previousItems = items;
    setItems(updatedItems);
    saveWishlistToCookie(updatedItems);
    setProducts(prev => prev.filter(p => p.id !== productId));
    
    try {
      const response = await fetch(`/api/wishlist/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Revert optimistic update
        setItems(previousItems);
        saveWishlistToCookie(previousItems);
        
        showError(data.error || 'Failed to remove from wishlist');
        return false;
      }
      
      // Update with server response
      if (data.wishlist) {
        setItems(data.wishlist);
        saveWishlistToCookie(data.wishlist);
      }
      
      success('Removed from wishlist');
      return true;
    } catch (err) {
      // Revert optimistic update
      setItems(previousItems);
      saveWishlistToCookie(previousItems);
      
      console.error('Remove from wishlist error:', err);
      showError('Failed to remove from wishlist');
      return false;
    }
  }, [items, success, showError]);

  /**
   * Refresh wishlist from server
   */
  const refreshWishlist = useCallback(async () => {
    await loadWishlist();
    await loadProducts();
  }, [loadWishlist, loadProducts]);

  /**
   * Clear wishlist
   */
  const clearWishlist = useCallback(() => {
    setItems([]);
    setProducts([]);
    saveWishlistToCookie([]);
  }, []);

  // Context value
  const value = useMemo<WishlistContextType>(() => ({
    items: isMounted ? items : [],
    products: isMounted ? products : [],
    isLoading,
    isLoadingProducts,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist,
    clearWishlist,
  }), [
    isMounted,
    items,
    products,
    isLoading,
    isLoadingProducts,
    error,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    refreshWishlist,
    clearWishlist,
  ]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

/**
 * useWishlist Hook
 * Access wishlist context
 */
export function useWishlist(): WishlistContextType {
  const context = useContext(WishlistContext);
  
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  
  return context;
}

/**
 * Export default
 */
export default WishlistProvider;

