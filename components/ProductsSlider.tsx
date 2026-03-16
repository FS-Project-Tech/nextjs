"use client";

import ProductCard from "@/components/ProductCard";
import { ProductCardProduct } from "@/lib/types/product";
import {
  getSalePercentageFromProduct,
  normalizeProductsList,
} from "@/lib/utils/product";

interface ProductsSliderProps {
  products: ProductCardProduct[] | { products?: ProductCardProduct[] } | null | undefined;
  gridCols?: 4 | 5 | 6;
}

export default function ProductsSlider({
  products: rawProducts,
  gridCols = 5,
}: ProductsSliderProps) {

  const products = normalizeProductsList(rawProducts);

  if (!products.length) {
    return null;
  }

  const gridClassMap = {
    6: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6 items-stretch",
    5: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5 items-stretch",
    4: "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 items-stretch",
  };

  const gridClass = gridClassMap[gridCols];

  return (
    <div className={gridClass}>
      {products.map((p) => (
        <div key={p.id} className="flex h-full min-h-0">
          <ProductCard
            id={p.id}
            slug={p.slug}
            name={p.name}
            sku={p.sku}
            price={p.price}
            sale_price={p.sale_price}
            regular_price={p.regular_price}
            on_sale={p.on_sale}
            sale_percentage={
              p.sale_percentage ?? getSalePercentageFromProduct(p) ?? undefined
            }
            tax_class={p.tax_class}
            tax_status={p.tax_status}
            average_rating={p.average_rating}
            rating_count={p.rating_count}
            imageUrl={p.images?.[0]?.src}
            imageAlt={p.images?.[0]?.alt || p.name}
          />
        </div>
      ))}
    </div>
  );
}