"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import ProductsPageSkeleton from "@/components/skeletons/ProductsPageSkeleton";

// Dynamically import ProductsPageClient - client component with ProductGrid and CartProvider dependencies
const ProductsPageClient = dynamic(() => import("@/components/ProductsPageClient"), {
  loading: () => <ProductsPageSkeleton />,
  ssr: false, // Client-side only to avoid chunk loading issues
});

export default function ProductsPageClientWrapper() {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsPageClient />
    </Suspense>
  );
}

