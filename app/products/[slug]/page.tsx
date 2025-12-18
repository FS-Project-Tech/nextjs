import wcAPI, {
  fetchProductBySlug,
  fetchProductVariations,
  fetchProducts,
  WooCommerceVariation,
} from "@/lib/woocommerce";
import ProductGallery from "@/components/ProductGallery";
import ProductDetailPanel from "@/components/ProductDetailPanel";
import ProductInfoAccordion from "@/components/ProductInfoAccordion";
import { getActivePromotions } from "@/lib/getActivePromotions";	
import { notFound } from "next/navigation";
import Image from "next/image";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  ProductStructuredData,
  BreadcrumbStructuredData,
} from "@/components/StructuredData";
import type { Metadata } from "next";
import Container from "@/components/Container";
import { ProductCardProduct } from "@/lib/types/product";
import RelatedProductsSection from "@/components/RelatedProductsSection";
import CategoryBrandsSection from "@/components/CategoryBrandsSection";	
import { extractProductBrands } from "@/lib/utils/product";
// import { sanitizeReview, stripHTML } from "@/lib/xss-sanitizer";
import { getErrorMessage } from "@/lib/utils/errors";
import { fetchProductSEO } from "@/lib/wordpress";
import { fetchGlobalPromotions } from "@/lib/promotions";


// ============================================================================
// ISR Configuration - Revalidate product pages every 5 minutes
// ============================================================================
export const revalidate = 300; // 5 minutes
// // app/products/[slug]/page.tsx
// export const dynamic = 'force-dynamic';

// Allow dynamic params for products not generated at build time
export const dynamicParams = true;



/**
 * Generate static params for popular/featured products at build time
 * Other products will be generated on-demand (ISR)
 */
export async function generateStaticParams() {
  try {
    // Fetch featured/popular products for static generation at build time
    // Limit to top 100 products to keep build times reasonable
    const result = await fetchProducts({ 
      per_page: 100,
      featured: true,
    });
    
    const products = result?.products || [];
    
    return products.map((product: { slug: string }) => ({
      slug: product.slug,
    }));
  } catch (error) {
    console.error('Error generating product static params:', error);
    // Return empty array - pages will be generated on-demand
    return [];
  }
}

// Generate metadata for Yoast SEO

export async function generateMetadata(
	{ params }: { params: { slug: string } }
  ): Promise<Metadata> {

	const wpProduct = await fetchProductSEO(params.slug);
  
	const yoast = wpProduct?.yoast_head_json;
  
	if (!yoast) {
	  return { title: wpProduct?.title?.rendered || "Product" };
	}
  
	return {
	  title: yoast.title,
	  description: yoast.description,
	  openGraph: {
		title: yoast.og_title,
		description: yoast.og_description,
		images: yoast.og_image?.map((img: any) => ({
		  url: img.url,
		  width: img.width,
		  height: img.height,
		})),
	  },
	  twitter: {
		title: yoast.twitter_title,
		description: yoast.twitter_description,
		images: yoast.twitter_image ? [yoast.twitter_image] : [],
	  },
	  alternates: {
		canonical: yoast.canonical,
	  },
	};
  }
  

export default async function ProductPage({ params }: { params: { slug: string } }) {
	const { slug } = params;

	const product = await fetchProductBySlug(slug).catch(() => null);
	if (!product) {
		notFound();
	}

	// 1. Fetch global promotions from ACF Options Page
	const promotions = await fetchGlobalPromotions();

	// 2. Get product category IDs
	const productCategoryIds =
	product.categories?.map((cat) => cat.id) || [];

	// 3. Resolve active promotions (category → fallback)
	const activePromotions = getActivePromotions(
	promotions,
	productCategoryIds
	);

	


	// Fetch variations server-side and pass to client panel
	const variations: WooCommerceVariation[] = await (async () => {
		try {
			// Not all products have variations
			// @ts-ignore - product may not have type field strictly
			if (!product.variations || product.variations.length === 0) return [] as WooCommerceVariation[];
			return await fetchProductVariations(product.id);
		} catch {
			return [] as WooCommerceVariation[];
		}
	})();

	// Related products by first category
	const firstCategoryId = product.categories?.[0]?.id;
	const [topSelling, similar] = await Promise.all([
		(async () => {
			if (!firstCategoryId) return [];
			try { 
				// Use date ordering instead of popularity
				const result = await fetchProducts({ per_page: 6, category: firstCategoryId, orderby: 'date', order: 'desc' });
				return result?.products || [];
			} catch (error: unknown) {
				if (process.env.NODE_ENV === 'development') {
					console.warn('Error fetching top selling products:', getErrorMessage(error));
				}
				return [];
			}
		})(),
		(async () => {
			if (!firstCategoryId) return [];
			try { 
				const result = await fetchProducts({ per_page: 6, category: firstCategoryId, orderby: 'date', order: 'desc' });
				return result?.products || [];
			} catch (error: unknown) {
				// Only log in development
				if (process.env.NODE_ENV === 'development') {
					console.warn('Error fetching similar products:', getErrorMessage(error));
				}
				return []; 
			}
		})(),
	]);

	// Breadcrumb items for structured data and UI
	const breadcrumbItems = [
		{ label: "Home", href: "/" },
		{ label: "Shop", href: "/shop" },
		...(product.categories?.[0]
			? [
					{
						label: product.categories[0].name,
						href: `/product-category/${product.categories[0].slug}`,
					},
			  ]
			: []),
		{ label: product.name },
	];

	// Convert products to ProductCardProduct format
	const toProductCardProduct = (
		p: Awaited<ReturnType<typeof fetchProducts>>['products'][0]
	): ProductCardProduct => ({
		id: p.id,
		slug: p.slug,
		name: p.name,
		sku: p.sku,
		price: p.price,
		sale_price: p.sale_price,
		regular_price: p.regular_price,
		on_sale: p.on_sale,
		tax_class: p.tax_class,
		tax_status: p.tax_status,
		average_rating: p.average_rating,
		rating_count: p.rating_count,
		images: p.images,
	});

	const productBrands = extractProductBrands(product);

	return (
		<>
			{/* Structured Data for SEO */}
			{/* <ProductStructuredData product={product} />
			<BreadcrumbStructuredData items={breadcrumbItems} /> */}
			
			<div className="min-h-screen py-12">
				<Container>
					<Breadcrumbs items={breadcrumbItems} />
				</Container>

				<Container className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-10 mt-6">
				{/* Left: Gallery (40%) */}
				<div className="lg:col-span-2">
					<ProductGallery images={(product.images || []).map((img) => ({ id: img.id, src: img.src, alt: img.alt, name: img.name }))} />
				</div>
				{/* Center: Details (40%) */}
				<div className="lg:col-span-2">
					<ProductDetailPanel product={product} variations={variations} />
				</div>
				
				{/* Right: Vertical placeholder (20%) */}
				<div className="lg:col-span-1 product-page-promotion space-y-4">
					{activePromotions.map((promo: any, index: number) => (
						<a
						key={index}
						href={promo.link?.url}
						target={promo.link?.target || "_self"}
						className="relative block overflow-hidden rounded-xl border border-gray-200 aspect-[3/5] lg:h-[28rem]"
						>
						<Image
							src={promo.image?.url}
							alt={promo.image?.alt || "Promotion"}
							fill
							className="object-cover"
							priority={index === 0}
						/>
						</a>
					))}
				</div>


				</Container>

			{/* Full-width description section */}
			{product && (
				<Container className="mt-10">
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
						{/* Left 60% - Accordions */}
						<div className="lg:col-span-3">
							<h2 className="mb-3 text-xl font-semibold text-gray-900">Product details</h2>
							<ProductInfoAccordion product={product} variations={variations} />
						</div>

						{/* Right 40% - Reviews */}
						<div className="lg:col-span-2">
							<h2 className="mb-3 text-xl font-semibold text-gray-900">Product reviews</h2>
							{/* Reviews temporarily disabled to avoid SSR runtime crash */}
							<div className="rounded border p-4 text-sm text-gray-600">
							Reviews loading temporarily disabled.
							</div>
	
						</div>
					</div>
				</Container>
			)}

			{/* Related sections */}
			{firstCategoryId && (
				<Container className="mt-10 space-y-10">
					{/* Top most selling */}
					<RelatedProductsSection
						title="Top most selling products"
						viewAllHref={`/shop?category=${encodeURIComponent(firstCategoryId)}&orderby=popularity`}
						products={topSelling.map(toProductCardProduct)}
					/>

					{/* Similar products */}
					<RelatedProductsSection
						title="Similar products"
						viewAllHref={`/shop?category=${encodeURIComponent(firstCategoryId)}&orderby=date&order=desc`}
						products={similar.map(toProductCardProduct)}
					/>
				</Container>
			)}
		</div>
		</>
	);
}
