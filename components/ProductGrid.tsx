"use client";

import { useEffect, useRef, useMemo, useReducer, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { ProductCardProduct } from "@/lib/types/product";
import { getSalePercentageFromProduct } from "@/lib/utils/product";

interface ProductGridProps {
  categorySlug?: string;
  /** When set, fetch products for this brand (e.g. on /brands/[slug] page) */
  brandSlug?: string;
  /** When true, only fetch products on sale (clearance page) */
  onSaleOnly?: boolean;
}

interface GridState {
  products: ProductCardProduct[];
  loading: boolean;
  error: string | null;
  page: number;
  total: number;
  hasMore: boolean;
  isInitialLoad: boolean;
}

type GridAction =
  | { type: 'FETCH_START'; isInitial?: boolean }
  | { type: 'FETCH_SUCCESS'; products: ProductCardProduct[]; total: number; totalPages: number; append: boolean; pageNum: number }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'LOAD_MORE' }
  | { type: 'RESET' };

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Top Rated" },
  { value: "popularity", label: "Most Popular" },
] as const;

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

export default function ProductGrid({ categorySlug, brandSlug, onSaleOnly }: ProductGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(gridReducer, initialState);
  const observerTarget = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  // Parse search params once (brandSlug from page prop takes precedence over URL for /brands/[slug])
  const filters = useMemo(() => {
    const params: Record<string, string> = {};
    
    if (categorySlug) {
      params.categorySlug = categorySlug;
    } else if (searchParams.get("categories")) {
      params.categories = searchParams.get("categories")!;
    }
    
    const brands = brandSlug ?? searchParams.get("brands");
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
    if (onSaleOnly) params.on_sale = "true";
    
    return params;
  }, [categorySlug, brandSlug, searchParams, onSaleOnly]);

  // Fetch products with abort support (stable when filters change)
  const fetchProducts = useCallback(async (pageNum: number, append: boolean = false) => {
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

        if (fetchId !== fetchIdRef.current) return;

        const text = await res.text();

        if (!text || text.trim() === '') {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          throw new Error('Server returned empty response');
        }

        let json: Record<string, unknown> | unknown[];
        try {
          json = JSON.parse(text) as Record<string, unknown> | unknown[];
        } catch {
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          throw new Error('Invalid server response');
        }

        if (!res.ok) {
          const err = json as Record<string, unknown>;
          throw new Error((err?.error as string) || (err?.message as string) || `HTTP ${res.status}`);
        }

        const rawProducts = Array.isArray(json)
          ? json
          : (json as Record<string, unknown>)?.products;

        if (!Array.isArray(rawProducts)) {
          dispatch({
            type: 'FETCH_SUCCESS',
            products: [],
            total: 0,
            totalPages: 0,
            append,
            pageNum,
          });
          return;
        }

        const jsonObject = Array.isArray(json) ? null : (json as Record<string, unknown>);

        const total =
          typeof jsonObject?.total === "number"
            ? jsonObject.total
            : rawProducts.length;

        const totalPages =
          typeof jsonObject?.totalPages === "number"
            ? jsonObject.totalPages
            : 1;

        dispatch({
          type: 'FETCH_SUCCESS',
          products: rawProducts as ProductCardProduct[],
          total,
          totalPages,
          append,
          pageNum,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        lastError = err instanceof Error ? err : new Error('Unknown error');

        if (attempt < maxRetries && (
          lastError.message?.includes('empty') ||
          lastError.message?.includes('network') ||
          lastError.message?.includes('timeout') ||
          lastError.name === 'TypeError'
        )) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        break;
      }
    }

    dispatch({
      type: 'FETCH_ERROR',
      error: lastError?.message || 'Failed to load products',
    });
  }, [filters]);

  // Reset and fetch when filters change
  useEffect(() => {
    dispatch({ type: 'RESET' });
    fetchProducts(1, false);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchProducts]);

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
  }, [state.hasMore, state.loading, state.page, fetchProducts]);

  const currentSort = filters.sortBy || 'relevance';

  const handleSortChange = useCallback((sortBy: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortBy === 'relevance') {
      params.delete('sortBy');
    } else {
      params.set('sortBy', sortBy);
    }
    params.delete('page');
    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : '', { scroll: false });
  }, [searchParams, router]);

  // Loading skeleton
  if (state.isInitialLoad && state.loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
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
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
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
            sale_percentage={product.sale_percentage ?? getSalePercentageFromProduct(product) ?? undefined}
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