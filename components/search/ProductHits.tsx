"use client";

import { useHits } from "react-instantsearch";
import ProductCard from "@/components/ProductCard";
import { ProductCardProduct } from "@/lib/types/product";

export default function ProductHits() {
  const { hits } = useHits();

  return (
    <div className="grid grid-cols-3 gap-6">
      {hits.map((product: any) => (
        <ProductCard key={product.objectID} id={product.id} slug={product.slug} name={product.name} price={product.price} imageUrl={product.image} imageAlt={product.image_alt} />
      ))}
    </div>
  );
}