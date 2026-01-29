"use client";

import { useMemo } from "react";
import ProductCard from "@/components/ProductCard";
import { ProductCardProduct } from "@/lib/types/product";

interface ProductsSliderProps {
  products: ProductCardProduct[] | { products?: ProductCardProduct[] } | null | undefined;
  /** Variant: 'default' uses ProductsSlider settings, 'mini' uses MiniProductsSlider settings */
  variant?: 'default' | 'mini';
}

export default function ProductsSlider({ products: rawProducts, variant = 'default' }: ProductsSliderProps) {
  // Normalize products to always be an array
  const products = useMemo(() => {
    if (!rawProducts) return [];
    if (Array.isArray(rawProducts)) return rawProducts;
    // Handle case where someone passes { products: [...] } object
    if (typeof rawProducts === 'object' && 'products' in rawProducts && Array.isArray(rawProducts.products)) {
      return rawProducts.products;
    }
    return [];
  }, [rawProducts]);

  // Early return if no products
  if (!products || products.length === 0) {
    return null;
  }

  // Helper function to render ProductCard
  const renderProductCard = (p: ProductCardProduct) => (
    <ProductCard
      id={p.id}
      slug={p.slug}
      name={p.name}
      sku={p.sku}
      price={p.price}
      sale_price={p.sale_price}
      regular_price={p.regular_price}
      on_sale={p.on_sale}
      tax_class={p.tax_class}
      tax_status={p.tax_status}
      average_rating={p.average_rating}
      rating_count={p.rating_count}
      imageUrl={p.images?.[0]?.src}
      imageAlt={p.images?.[0]?.alt || p.name}
    />
  );

  // Grid layout classes based on variant
  const gridClass = variant === 'mini' 
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4"
    : "grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4";

  return (
    <div className={gridClass}>
      {products.map((p) => (
        <div key={p.id} className="h-full">
          {renderProductCard(p)}
        </div>
      ))}
    </div>
  );
}