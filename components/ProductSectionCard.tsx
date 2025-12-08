"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import ProductsSliderSkeleton from "@/components/skeletons/ProductsSliderSkeleton";
import Container from "@/components/Container";

// Dynamically import ProductsSlider - heavy component with Swiper
const ProductsSlider = dynamic(() => import("@/components/ProductsSlider"), {
  loading: () => <ProductsSliderSkeleton />,
  ssr: false, // Client-side only for Swiper
});

interface ProductSectionCardProps {
  title: string;
  subtitle?: string;
  products: any[] | { products?: any[] } | null | undefined;
  loading?: boolean;
  variant?: 'default' | 'mini';
  bgColor?: 'violet' | 'blue' | 'indigo' | 'rose' | 'sky' | 'emerald';
  emptyMessage?: string;
  className?: string;
}

/**
 * Reusable product section card component
 * Used by RecommendedSection, RecentlyViewedSection, TrendingSectionClient, etc.
 */
export default function ProductSectionCard({
  title,
  subtitle,
  products: rawProducts,
  loading = false,
  variant = 'default',
  bgColor = 'violet',
  emptyMessage = "No products found.",
  className = "",
}: ProductSectionCardProps) {
  // Normalize products to always be an array
  const products = (() => {
    if (!rawProducts) return [];
    if (Array.isArray(rawProducts)) return rawProducts;
    if (typeof rawProducts === 'object' && 'products' in rawProducts && Array.isArray(rawProducts.products)) {
      return rawProducts.products;
    }
    return [];
  })();

  const bgColorClass = {
    violet: 'bg-violet-50',
    blue: 'bg-blue-50',
    indigo: 'bg-indigo-50',
    rose: 'bg-rose-50',
    sky: 'bg-sky-50',
    emerald: 'bg-emerald-50',
  }[bgColor];

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className={`mb-10 ${className}`}>
      <Container>
        <div className={`rounded-xl ${bgColorClass} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          </div>
          {loading && products.length === 0 ? (
            <ProductsSliderSkeleton />
          ) : products && products.length > 0 ? (
            <ProductsSlider products={products} variant={variant} />
          ) : (
            <div className="rounded-lg bg-white p-8 text-center text-gray-600">
              {emptyMessage}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

