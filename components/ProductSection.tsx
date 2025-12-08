import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { fetchCategoryBySlug, fetchProducts } from "@/lib/woocommerce";
import ProductSectionWrapper from "@/components/ProductSectionWrapper";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  bgClassName?: string; // e.g., 'bg-rose-50'
  query?: {
    categorySlug?: string;
    orderby?: string;
    order?: string;
    featured?: boolean;
  };
}

export default async function ProductSection(props: ProductSectionProps) {
  const { title, subtitle, viewAllHref, bgClassName, query } = props;

  // Resolve category by slug if provided
  let categoryId: string | undefined;
  if (query?.categorySlug) {
    const cat = await fetchCategoryBySlug(query.categorySlug).catch(() => null);
    if (cat) categoryId = String(cat.id);
  }

  const products = await (async () => {
    try {
      const result = await fetchProducts({
        per_page: 10,
        category: categoryId,
        orderby: query?.orderby,
        order: query?.order,
        featured: query?.featured,
      });
      
      const fetchedProducts = result?.products || [];
      if (fetchedProducts.length > 0) {
        return fetchedProducts;
      }
    } catch (error) {
      // Don't log here - errors are already logged by the interceptor
      if (process.env.NODE_ENV === 'development' && !(error as any)?.response) {
        console.error(`[ProductSection: ${title}] primary fetch error`, error);
      }
    }

    // Fallback: fetch popular products to keep the section populated
    try {
      const result = await fetchProducts({
        per_page: 10,
        orderby: "popularity",
        order: "desc",
      });
      return result?.products || [];
    } catch (fallbackError) {
      if (process.env.NODE_ENV === 'development' && !(fallbackError as any)?.response) {
        console.error(`[ProductSection: ${title}] fallback fetch error`, fallbackError);
      }
      return [];
    }
  })();

  return (
    <ProductSectionWrapper title={title} subtitle={subtitle} viewAllHref={viewAllHref} products={products} />
  );
}


