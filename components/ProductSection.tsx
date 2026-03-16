import ProductSectionCard from "@/components/ProductSectionCard";
import { fetchCategoryBySlug, fetchProducts } from "@/lib/woocommerce";
import { Product } from "@/lib/types/product";

export const revalidate = 300;

const SECTION_SIZE = 5;

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  query?: {
    categorySlug?: string;
    orderby?: string;
    order?: string;
    featured?: boolean;
  };
}

export default async function ProductSection({
  title,
  subtitle,
  viewAllHref,
  query,
}: ProductSectionProps) {
  let categoryId: number | undefined;

  /* ---------------- CATEGORY LOOKUP ---------------- */

  if (query?.categorySlug) {
    try {
      const category = await fetchCategoryBySlug(query.categorySlug);
      categoryId = category?.id;
    } catch {
      categoryId = undefined;
    }
  }

  /* ---------------- PRODUCTS FETCH ---------------- */

  let products: Product[] = [];

  try {
    const result = await fetchProducts({
      per_page: SECTION_SIZE,
      category: categoryId,
      orderby: query?.orderby,
      order: query?.order,
      featured: query?.featured,
    });

    products = result?.products ?? [];
  } catch {
    products = [];
  }

  /* ---------------- FALLBACK PRODUCTS ---------------- */

  if (!products.length) {
    try {
      const fallback = await fetchProducts({
        per_page: SECTION_SIZE,
        orderby: "popularity",
        order: "desc",
      });

      products = fallback?.products ?? [];
    } catch {
      products = [];
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <ProductSectionCard
      title={title}
      subtitle={subtitle}
      viewAllHref={viewAllHref}
      products={products}
      emptyMessage="No products available at the moment."
    />
  );
}