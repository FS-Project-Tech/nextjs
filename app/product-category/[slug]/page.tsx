import { fetchCategoryBySlug, fetchCategories } from "@/lib/woocommerce";
import CategoryPageClient from "@/components/CategoryPageClient";
import type { Metadata } from "next";
import { fetchCategorySEO } from "@/lib/wordpress";

// ============================================================================
// ISR Configuration
// ============================================================================
export const revalidate = 600; // 10 minutes
export const dynamicParams = true;

// ============================================================================
// Static params (top-level categories only)
// ============================================================================
export async function generateStaticParams() {
  try {
    const categories = await fetchCategories({
      per_page: 50,
      parent: 0,
      hide_empty: true,
    });

    return categories.map((category: { slug: string }) => ({
      slug: category.slug,
    }));
  } catch (error) {
    console.error("Error generating category static params:", error);
    return [];
  }
}

// ============================================================================
// Metadata (params is ASYNC in Next.js 15)
// ============================================================================
export async function generateMetadata(
  props: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  try {
    const { slug } = await props.params;
    const decodedSlug = decodeURIComponent(slug);

    const wpCategory = await fetchCategorySEO(decodedSlug);
    const yoast = wpCategory?.yoast_head_json;

    if (!yoast) {
      return {
        title: wpCategory?.name || "Category",
      };
    }

    return {
      title: yoast.title,
      description: yoast.description,
      openGraph: {
        title: yoast.og_title,
        description: yoast.og_description,
        url: yoast.canonical,
        images: yoast.og_image?.map((img: any) => ({
          url: img.url,
          width: img.width,
          height: img.height,
          alt: img.alt || yoast.title,
        })),
      },
      twitter: {
        card: "summary_large_image",
        title: yoast.twitter_title || yoast.title,
        description: yoast.twitter_description || yoast.description,
        images: yoast.twitter_image ? [yoast.twitter_image] : [],
      },
      alternates: {
        canonical: yoast.canonical,
      },
    };
  } catch {
    // Never crash the route because of metadata
    return { title: "Category" };
  }
}

// ============================================================================
// Page (params is ASYNC in Next.js 15)
// ============================================================================
export default async function CategoryPage(
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);

  const category = await fetchCategoryBySlug(decodedSlug).catch(() => null);

  return (
    <CategoryPageClient
      initialSlug={decodedSlug}
      initialCategoryName={category?.name}
    />
  );
}