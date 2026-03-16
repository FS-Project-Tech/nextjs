import { fetchProducts, type WooCommerceProduct } from "@/lib/woocommerce";
import TrendingSectionClient from "@/components/TrendingSectionClient";
import { ProductCardProduct } from "@/lib/types/product";

export const revalidate = 60; // refresh every minute

export default async function TrendingSection() {
  let products: ProductCardProduct[] = [];

  try {
    const result = await fetchProducts({
      per_page: 5,
      orderby: "popularity",
      on_sale: true,
      _fields: "id,name,slug,price,regular_price,sale_price,images"
    });

    const raw = result?.products || [];

    products = raw.map((p: WooCommerceProduct) => ({
      id: Number(p.id),
      name: String(p.name ?? ""),
      slug: String(p.slug ?? ""),
      price: String(p.price ?? ""),
      regular_price: p.regular_price ? String(p.regular_price) : undefined,
      sale_price: p.sale_price ? String(p.sale_price) : undefined,
      on_sale: Boolean(p.on_sale),
      sku: p.sku ? String(p.sku) : undefined,
      tax_class: p.tax_class ? String(p.tax_class) : undefined,
      tax_status: p.tax_status ? String(p.tax_status) : undefined,
      average_rating: p.average_rating ? String(p.average_rating) : undefined,
      rating_count: p.rating_count ? Number(p.rating_count) : undefined,
      images: Array.isArray(p.images) ? p.images : [],
    })) as ProductCardProduct[];
  } catch (error) {
    console.error("TrendingSection fetch error:", error);
    products = [];
  }

  return <TrendingSectionClient products={products} />;
}