import { fetchProducts } from "@/lib/woocommerce";
import TrendingSectionClient from "./TrendingSectionClient";

export default async function TrendingSection() {
  let products: any[] = [];
  try {
    // Fetch more products to ensure we have enough on-sale items
    const result = await fetchProducts({ per_page: 50, orderby: "popularity" as any });
    const allProducts = result?.products || [];
    // Filter to only show products that are on sale
    products = allProducts.filter((product: any) => product.on_sale === true);
  } catch {}
  
  return <TrendingSectionClient products={products} />;
}


