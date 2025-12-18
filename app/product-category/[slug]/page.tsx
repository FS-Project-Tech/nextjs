import { fetchCategoryBySlug, fetchCategories } from "@/lib/woocommerce";
import CategoryPageClient from "@/components/CategoryPageClient";
// import { BreadcrumbStructuredData } from "@/components/StructuredData";
import type { Metadata } from "next";
import { fetchCategorySEO } from "@/lib/wordpress";

// ============================================================================
// ISR Configuration - Revalidate category pages every 10 minutes
// ============================================================================
export const revalidate = 600; // 10 minutes

// Allow dynamic params for categories not generated at build time
export const dynamicParams = true;

/**
 * Generate static params for top-level categories at build time
 * Other categories will be generated on-demand
 */
export async function generateStaticParams() {
  try {
    // Fetch top-level categories for static generation
    const categories = await fetchCategories({ 
      per_page: 50, 
      parent: 0, 
      hide_empty: true 
    });
    
    return categories.map((category: { slug: string }) => ({
      slug: category.slug,
    }));
  } catch (error) {
    console.error('Error generating category static params:', error);
    // Return empty array - pages will be generated on-demand
    return [];
  }
}

// Generate metadata for category pages
export async function generateMetadata(
	{ params }: { params: { slug: string } }
  ): Promise<Metadata> {
  
	const wpCategory = await fetchCategorySEO(params.slug);
  
	if (!wpCategory?.yoast_head_json) {
	  return {
		title: wpCategory?.name || "Category",
	  };
	}
  
	const yoast = wpCategory.yoast_head_json;
  
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
  }


export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const category = await fetchCategoryBySlug(slug).catch(() => null);

	// Breadcrumb items for structured data
	const breadcrumbItems = [
		{ label: 'Home', href: '/' },
		{ label: 'Shop', href: '/shop' },
		{ label: category?.name || 'Category' },
	];

	return (
		<>
			{/* Structured Data for SEO */}
			{/* {category && <BreadcrumbStructuredData items={breadcrumbItems} />} */}
			
			<CategoryPageClient 
				initialSlug={slug}
				initialCategoryName={category?.name}
			/>
		</>
	);
}
