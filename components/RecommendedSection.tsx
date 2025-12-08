"use client";

import { useEffect, useRef, useState } from "react";
import { useMounted } from "@/hooks/useMounted";
import { getRecentSearchTerms } from "@/lib/history";
import { ProductCardProduct } from "@/lib/types/product";
import ProductSectionCard from "@/components/ProductSectionCard";

const mapToProductCardProducts = (items: any[]): ProductCardProduct[] => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item.id === "number" && item.slug && item.name)
    .map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      sku: item.sku ?? null,
      price: item.price ?? item.sale_price ?? "0",
      regular_price: item.regular_price ?? item.regularPrice ?? item.price ?? "0",
      sale_price: item.sale_price ?? null,
      on_sale: item.on_sale ?? false,
      tax_class: item.tax_class,
      tax_status: item.tax_status,
      average_rating: item.average_rating,
      rating_count: item.rating_count,
      images: item.images
        ? item.images
        : item.image
        ? [{ src: item.image, alt: item.name }]
        : [],
    }));
};

const fetchFallbackProducts = async (): Promise<ProductCardProduct[]> => {
  try {
    const res = await fetch("/api/products?per_page=10&sortBy=popularity", {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return mapToProductCardProducts(data.products).slice(0, 10);
  } catch (error) {
    console.error("RecommendedSection fallback error:", error);
    return [];
  }
};

export default function RecommendedSection() {
  const isMounted = useMounted();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductCardProduct[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isMounted) return;
    mountedRef.current = true;

    const loadProducts = async () => {
      const terms = getRecentSearchTerms();
      try {
        if (mountedRef.current) setLoading(true);

        let recommended: ProductCardProduct[] = [];

        if (terms.length > 0) {
          const top = terms.slice(0, 4);
          const responses = await Promise.all(
            top.map((t) =>
              fetch(`/api/search-unified?q=${encodeURIComponent(t)}`, {
                cache: "no-store",
              }).then((r) => (r.ok ? r.json() : { products: [] }))
            )
          );
          const all = responses.flatMap((r: any) =>
            Array.isArray(r.products) ? r.products : []
          );
          const seen = new Set<number>();
          const uniqueSearchResults = all.filter((p: any) => {
            if (!p || typeof p.id !== "number") return false;
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
          recommended = mapToProductCardProducts(uniqueSearchResults).slice(0, 10);
        }

        if (recommended.length === 0) {
          recommended = await fetchFallbackProducts();
        }

        if (mountedRef.current) setProducts(recommended);
      } catch (error) {
        console.error("RecommendedSection error:", error);
        if (mountedRef.current) {
          const fallback = await fetchFallbackProducts();
          setProducts(fallback);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    loadProducts();
    return () => {
      mountedRef.current = false;
    };
  }, [isMounted]);

  if (!isMounted) return null;
  if (!loading && products.length === 0) return null;

  return (
    <ProductSectionCard
      title="Products you may be looking for"
      subtitle="Based on your recent searches"
      products={products}
      loading={loading}
      variant="default"
      bgColor="violet"
    />
  );
}


