import wcAPI, {
  fetchProductBySlug,
  fetchProductVariations,
  fetchProducts,
  WooCommerceVariation,
} from "@/lib/woocommerce";
import ProductGallery from "@/components/ProductGallery";
import ProductDetailPanel from "@/components/ProductDetailPanel";
import ProductInfoAccordion from "@/components/ProductInfoAccordion";
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
import { sanitizeReview, stripHTML } from "@/lib/xss-sanitizer";
import { getErrorMessage } from "@/lib/utils/errors";

// ============================================================================
// ISR Configuration - Revalidate product pages every 5 minutes
// ============================================================================
export const revalidate = 300; // 5 minutes
// app/products/[slug]/page.tsx
export const dynamic = 'force-dynamic';

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

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const product = await fetchProductBySlug(slug).catch(() => null);
	
	if (!product) {
		return {
			title: 'Product Not Found',
		};
	}

	const price = product.on_sale && product.sale_price 
		? product.sale_price 
		: product.price || product.regular_price;
	
	const imageUrl = product.images?.[0]?.src || '';
	const description = product.short_description 
		? product.short_description.replace(/<[^>]*>/g, '').substring(0, 160)
		: `${product.name} - ${product.price ? `$${price}` : 'View product details'}`;

	return {
		title: `${product.name} | WooCommerce Store`,
		description: description,
		openGraph: {
			title: product.name,
			description: description,
			images: imageUrl ? [
				{
					url: imageUrl,
					width: 1200,
					height: 1200,
					alt: product.images?.[0]?.alt || product.name,
				}
			] : [],
			type: 'website',
		},
		twitter: {
			card: 'summary_large_image',
			title: product.name,
			description: description,
			images: imageUrl ? [imageUrl] : [],
		},
		alternates: {
			canonical: `/products/${slug}`,
		},
	};
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;

	const product = await fetchProductBySlug(slug).catch(() => null);
	if (!product) {
		notFound();
	}

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
			<ProductStructuredData product={product} />
			<BreadcrumbStructuredData items={breadcrumbItems} />
			
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
				<div className="lg:col-span-1">
					<div className="relative overflow-hidden rounded-xl border border-gray-200 aspect-[3/5] sm:aspect-[2/3] lg:h-[28rem]">
						<Image 
							src="https://picsum.photos/600/1200?random=31"
							alt="Promotional"
							fill
							sizes="(max-width: 1024px) 100vw, 20vw"
							className="object-cover"
						/>
					</div>
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
							{await (async () => {
								try {
									const res = await wcAPI.get('/products/reviews', { params: { product: product.id, per_page: 5 } });
									const reviews = Array.isArray(res.data) ? res.data : [];
									if (reviews.length === 0) return <div className="rounded border p-4 text-sm text-gray-600">No reviews yet.</div>;
									return (
										<ul className="space-y-3">
											{reviews.map((r: any) => (
												<li key={r.id} className="rounded border p-3">
													<div className="text-sm font-medium text-gray-900">{stripHTML(r.reviewer)}</div>
													<div className="text-xs text-gray-500">Rating: {r.rating || 0}/5</div>
													<div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: sanitizeReview(r.review || '') }} />
												</li>
											))}
										</ul>
									);
								} catch {
									return <div className="rounded border p-4 text-sm text-gray-600">Reviews unavailable.</div>;
								}
							})()}
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
