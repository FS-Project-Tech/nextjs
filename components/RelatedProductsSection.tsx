"use client";

import dynamic from "next/dynamic";
import ProductsSliderSkeleton from "@/components/skeletons/ProductsSliderSkeleton";
import { ProductCardProduct } from "@/lib/types/product";

// Dynamically import ProductsSlider for client-side only
const ProductsSlider = dynamic(() => import("@/components/ProductsSlider"), {
  loading: () => <ProductsSliderSkeleton />,
  ssr: false,
});

interface RelatedProductsSectionProps {
  title: string;
  viewAllHref: string;
  products: ProductCardProduct[] | null | undefined;
}

export default function RelatedProductsSection({
  title,
  viewAllHref,
  products,
}: RelatedProductsSectionProps) {
  if (!products || !Array.isArray(products) || products.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <a
          href={viewAllHref}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all
        </a>
      </div>
      <ProductsSlider products={products} variant="default" />
    </section>
  );
}

