// app/components/ProductSection.tsx

import ProductSectionWrapper from "@/components/ProductSectionWrapper";
import { fetchCategoryBySlug, fetchProducts } from "@/lib/woocommerce";
import { Product } from "@/lib/types/product";

/**
 * Revalidate this section every 5 minutes
 * (Ideal for homepage / category sections)
 */
export const revalidate = 300;

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
  let products: Product[] = [];

  /**
   * Resolve category ID (optional)
   */
  if (query?.categorySlug) {
    try {
      const category = await fetchCategoryBySlug(query.categorySlug);
      if (category?.id) {
        categoryId = category.id;
      }
    } catch {
      // Silent fail — fallback handled below
    }
  }

  /**
   * Primary fetch
   */
  try {
    const result = await fetchProducts({
      per_page: 10,
      category: categoryId,
      orderby: query?.orderby,
      order: query?.order,
      featured: query?.featured,
    });

    products = result?.products ?? [];
  } catch {
    // Ignore — fallback below
  }

  /**
   * Fallback: Popular products
   */
  if (products.length === 0) {
    try {
      const fallback = await fetchProducts({
        per_page: 10,
        orderby: "popularity",
        order: "desc",
      });

      products = fallback?.products ?? [];
    } catch {
      products = [];
    }
  }

  return (
    <ProductSectionWrapper
      title={title}
      subtitle={subtitle}
      viewAllHref={viewAllHref}
      products={products}
    />
  );
}
