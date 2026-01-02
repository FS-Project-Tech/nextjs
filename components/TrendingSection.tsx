import { fetchProducts } from "@/lib/woocommerce";
import TrendingSectionClient from "@/components/TrendingSectionClient";
import { ProductCardProduct } from "@/lib/types/product";

export const revalidate = 300; // ISR – 5 minutes

export default async function TrendingSection() {
  let products: ProductCardProduct[] = [];

  try {
    const result = await fetchProducts({
      per_page: 12,
      orderby: "popularity",
      on_sale: true,
    });

    products = (result?.products || []) as ProductCardProduct[];
  } catch {}

  return <TrendingSectionClient products={products} />;
}
