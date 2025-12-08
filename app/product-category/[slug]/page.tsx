import { fetchCategoryBySlug, fetchCategories } from "@/lib/woocommerce";
import CategoryPageClient from "@/components/CategoryPageClient";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import type { Metadata } from "next";

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
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const category = await fetchCategoryBySlug(slug).catch(() => null);
	
	if (!category) {
		return {
			title: "Category Not Found",
		};
	}

	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';
	
	return {
		title: category.name,
		description: category.description 
			? category.description.replace(/<[^>]*>/g, '').substring(0, 160)
			: `Browse ${category.name} products at our store`,
		openGraph: {
			title: `${category.name} | WooCommerce Store`,
			description: category.description 
				? category.description.replace(/<[^>]*>/g, '').substring(0, 160)
				: `Browse ${category.name} products`,
			type: "website",
			url: `${siteUrl}/product-category/${slug}`,
		},
		twitter: {
			card: "summary_large_image",
			title: category.name,
			description: category.description 
				? category.description.replace(/<[^>]*>/g, '').substring(0, 160)
				: `Browse ${category.name} products`,
		},
		alternates: {
			canonical: `/product-category/${slug}`,
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
			{category && <BreadcrumbStructuredData items={breadcrumbItems} />}
			
			<CategoryPageClient 
				initialSlug={slug}
				initialCategoryName={category?.name}
			/>
		</>
	);
}
