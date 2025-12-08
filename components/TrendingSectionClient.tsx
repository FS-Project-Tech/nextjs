"use client";

import { ProductCardProduct } from "@/lib/types/product";
import ProductSectionCard from "@/components/ProductSectionCard";

interface TrendingSectionClientProps {
  products: any[];
}

export default function TrendingSectionClient({ products }: TrendingSectionClientProps) {
  // Filter to ensure only on-sale products are displayed
  const onSaleProducts = (products?.filter((product) => product.on_sale === true) || []) as ProductCardProduct[];
  
  if (!onSaleProducts || onSaleProducts.length === 0) return null;

  return (
    <ProductSectionCard
      title="Clearance products (on sale)"
      subtitle="Special deals and discounted items"
      products={onSaleProducts}
      loading={false}
      variant="mini"
      bgColor="indigo"
    />
  );
}

