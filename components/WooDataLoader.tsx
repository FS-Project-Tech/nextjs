/**
 * WooCommerce Data Loader Component
 * Provides fallback loading states for dynamic data fetching
 */

"use client";

import { ReactNode } from 'react';

interface WooDataLoaderProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  error: Error | null;
  fallback?: T;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  emptyComponent?: ReactNode;
  children: (data: T) => ReactNode;
}

/**
 * Generic data loader with fallback states
 */
export function WooDataLoader<T>({
  data,
  isLoading,
  error,
  fallback,
  loadingComponent,
  errorComponent,
  emptyComponent,
  children,
}: WooDataLoaderProps<T>) {
  // Loading state
  if (isLoading) {
    return (
      <>
        {loadingComponent || (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        {errorComponent || (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-medium text-red-800">
              Error loading data: {error.message}
            </p>
            {fallback && (
              <p className="mt-2 text-xs text-red-600">
                Showing fallback data...
              </p>
            )}
          </div>
        )}
        {fallback && children(fallback)}
      </>
    );
  }

  // Empty state
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (fallback) {
      return <>{children(fallback)}</>;
    }

    return (
      <>
        {emptyComponent || (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-600">No data available</p>
          </div>
        )}
      </>
    );
  }

  // Success state
  return <>{children(data)}</>;
}

/**
 * Product grid loader with skeleton
 */
export function ProductGridLoader({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-lg mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-medium text-red-800">
          Error loading products: {error.message}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Category list loader with skeleton
 */
export function CategoryListLoader({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: Error | null;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-medium text-red-800">
          Error loading categories: {error.message}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

