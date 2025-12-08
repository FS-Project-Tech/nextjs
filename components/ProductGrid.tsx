"use client";

import { useEffect, useState, useRef, useMemo, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";

interface ProductGridProps {
  categorySlug?: string;
}

interface Product {
  id: number;
  slug: string;
  name: string;
  sku?: string;
  price: string;
  sale_price?: string;
  regular_price?: string;
  on_sale?: boolean;
  tax_class?: string;
  tax_status?: string;
  average_rating?: string;
  rating_count?: number;
  images?: Array<{ src: string; alt?: string }>;
}

interface GridState {
  products: Product[];
  loading: boolean;
  error: string | null;
  page: number;
  total: number;
  hasMore: boolean;
  isInitialLoad: boolean;
}

type GridAction =
  | { type: 'FETCH_START'; isInitial?: boolean }
  | { type: 'FETCH_SUCCESS'; products: Product[]; total: number; totalPages: number; append: boolean; pageNum: number }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'LOAD_MORE' }
  | { type: 'RESET' };

const initialState: GridState = {
  products: [],
  loading: true,
  error: null,
  page: 1,
  total: 0,
  hasMore: true,
  isInitialLoad: true,
};

function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'FETCH_START':
      return {
        ...state,
        loading: true,
        error: null,
        isInitialLoad: action.isInitial ?? state.isInitialLoad,
      };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        products: action.append ? [...state.products, ...action.products] : action.products,
        total: action.total,
        hasMore: action.pageNum < action.totalPages,
        loading: false,
        isInitialLoad: false,
      };
    case 'FETCH_ERROR':
      return {
        ...state,
        error: action.error,
        loading: false,
        isInitialLoad: false,
      };
    case 'LOAD_MORE':
      return {
        ...state,
        page: state.page + 1,
      };
    case 'RESET':
      return {
        ...initialState,
        loading: false,
      };
    default:
      return state;
  }
}

export default function ProductGrid({ categorySlug }: ProductGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(gridReducer, initialState);
  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  // Parse search params once
  const filters = useMemo(() => {
    const params: Record<string, string> = {};
    
    if (categorySlug) {
      params.categorySlug = categorySlug;
    } else if (searchParams.get("categories")) {
      params.categories = searchParams.get("categories")!;
    }
    
    const brands = searchParams.get("brands");
    const tag = searchParams.get("tag") || searchParams.get("tags");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const sortBy = searchParams.get("sortBy");
    const search = searchParams.get("query") || searchParams.get("Search") || searchParams.get("search");
    
    if (brands) params.brands = brands;
    if (tag) params.tags = tag;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (sortBy) params.sortBy = sortBy;
    if (search) params.search = search.trim();
    
    return params;
  }, [categorySlug, searchParams]);

  // Fetch products with abort support
  const fetchProducts = async (pageNum: number, append: boolean = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const fetchId = ++fetchIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    dispatch({ type: 'FETCH_START', isInitial: pageNum === 1 && !append });

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const params = new URLSearchParams({
          ...filters,
          per_page: '24',
          page: String(pageNum),
        });

        const res = await fetch(`/api/products?${params}`, {
          signal: controller.signal,
        });

        // Ignore response if a newer request was made
        if (fetchId !== fetchIdRef.current) return;

        // Try to parse JSON response
        const text = await res.text();
        
        // Handle empty response - retry if we have attempts left
        if (!text || text.trim() === '') {
          if (attempt < maxRetries) {
            console.log(`Empty response, retrying... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, 500)); // Wait 500ms before retry
            continue;
          }
          throw new Error('Server returned empty response');
        }

        let json;
        try {
          json = JSON.parse(text);
        } catch (parseError) {
          if (attempt < maxRetries) {
            console.log(`JSON parse error, retrying... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          throw new Error('Invalid server response');
        }

        // Check for error response
        if (!res.ok) {
          throw new Error(json?.error || json?.message || `HTTP ${res.status}`);
        }

        // Validate response structure - handle both array and object responses
        const products = Array.isArray(json) ? json : json?.products;
        if (!Array.isArray(products)) {
          // If products key exists but is not an array, return empty
          dispatch({
            type: 'FETCH_SUCCESS',
            products: [],
            total: 0,
            totalPages: 0,
            append,
          });
          return;
        }

        // Use the products array from whichever format we received
        const total = json?.total ?? products.length;
        const totalPages = json?.totalPages ?? 1;

        dispatch({
          type: 'FETCH_SUCCESS',
          products,
          total,
          totalPages,
          append,
          pageNum,
        });
        return; // Success - exit the retry loop
        
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        lastError = err;
        
        // Only retry on network-type errors
        if (attempt < maxRetries && (
          err.message?.includes('empty') ||
          err.message?.includes('network') ||
          err.message?.includes('timeout') ||
          err.name === 'TypeError'
        )) {
          console.log(`Fetch error, retrying... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        break; // Don't retry other errors
      }
    }

    // All retries exhausted
    dispatch({
      type: 'FETCH_ERROR',
      error: lastError?.message || 'Failed to load products',
    });
  };

  // Reset and fetch when filters change
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    dispatch({ type: 'RESET' });
    fetchProducts(1, false);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  // Infinite scroll
  useEffect(() => {
    if (!observerTarget.current || !state.hasMore || state.loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          dispatch({ type: 'LOAD_MORE' });
          fetchProducts(state.page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.hasMore, state.loading, state.page]);

  // Sort handler
  const currentSort = filters.sortBy || 'relevance';
  
  const handleSortChange = (sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === 'relevance') {
      params.delete('sortBy');
    } else {
      params.set('sortBy', sortBy);
    }
    params.delete('page');
    
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : '', { scroll: false });
  };

  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "price_low", label: "Price: Low to High" },
    { value: "price_high", label: "Price: High to Low" },
    { value: "newest", label: "Newest First" },
    { value: "rating", label: "Top Rated" },
    { value: "popularity", label: "Most Popular" },
  ];

  // Loading skeleton
  if (state.isInitialLoad && state.loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-lg bg-gray-200 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (state.error && state.products.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center">
        <p className="text-red-600 mb-2">{state.error}</p>
        <p className="text-sm text-gray-500">Please check your API configuration.</p>
        <button
          onClick={() => fetchProducts(1, false)}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (state.products.length === 0 && !state.loading) {
    const searchQuery = filters.search;
    return (
      <div className="rounded-lg bg-white p-8 text-center text-gray-600">
        <p className="mb-2">
          {searchQuery ? `No products found for "${searchQuery}"` : "No products found"}
        </p>
        <p className="text-sm text-gray-500">
          {searchQuery ? "Try a different search term or adjust filters" : "Try adjusting your filters"}
        </p>
      </div>
    );
  }

  // Progress percentage
  const progressPercent = state.total > 0 
    ? Math.round((state.products.length / state.total) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with results count and sort */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm text-gray-600">
          <span className="hidden sm:inline">Showing </span>
          <strong>{state.products.length}</strong>
          <span className="hidden sm:inline"> of</span>
          <span className="sm:hidden">/</span>
          <strong> {state.total}</strong>
          <span className="hidden sm:inline"> products</span>
          
          {/* Progress bar - visible when scrolling */}
          {state.total > 24 && (
            <div className="mt-1.5 w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
              <div 
                className="h-full bg-teal-500 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-gray-600 hidden sm:inline">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
            aria-label="Sort products"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {state.products.map((product) => (
          <ProductCard
            key={product.id}
            id={product.id}
            slug={product.slug}
            name={product.name}
            sku={product.sku}
            price={product.price}
            sale_price={product.sale_price}
            regular_price={product.regular_price}
            on_sale={product.on_sale}
            tax_class={product.tax_class}
            tax_status={product.tax_status}
            average_rating={product.average_rating}
            rating_count={product.rating_count}
            imageUrl={product.images?.[0]?.src}
            imageAlt={product.images?.[0]?.alt || product.name}
          />
        ))}
      </div>

      {/* Loading indicator for pagination */}
      {state.hasMore && (
        <div ref={observerTarget} className="py-8 text-center">
          {state.loading && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-teal-600" />
              <span className="text-xs text-gray-500">Loading more...</span>
            </div>
          )}
        </div>
      )}

      {/* End message */}
      {!state.hasMore && state.products.length > 0 && (
        <div className="py-4 text-center text-sm text-gray-500">
          No more products to load
        </div>
      )}
    </div>
  );
}