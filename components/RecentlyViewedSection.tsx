"use client";

import { useEffect, useState, useRef } from "react";
import { useMounted } from "@/hooks/useMounted";
import { ProductCardProduct } from "@/lib/types/product";
import ProductSectionCard from "@/components/ProductSectionCard";

function getViewedIds(): number[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem('_viewed_products');
    const list: Array<{ id: number; cats: number[] }> = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map((x) => x.id) : [];
  } catch { return []; }
}

export default function RecentlyViewedSection() {
  const isMounted = useMounted();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductCardProduct[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isMounted) return;
    mountedRef.current = true;
    const ids = getViewedIds();
    if (!ids.length) return;
    (async () => {
      try {
        if (mountedRef.current) setLoading(true);
        const res = await fetch(`/api/products-by-ids?ids=${ids.slice(0, 10).join(',')}`, { cache: 'no-store' });
        const json = await res.json();
        if (mountedRef.current) setProducts(json.products || []);
      } catch {
        if (mountedRef.current) setProducts([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => { mountedRef.current = false; };
  }, [isMounted]);

  if (!isMounted) return null;
  if (!loading && products.length === 0) return null;

  return (
    <ProductSectionCard
      title="Continue browsing"
      subtitle="Recently viewed by you"
      products={products}
      loading={loading}
      variant="mini"
      bgColor="blue"
    />
  );
}


