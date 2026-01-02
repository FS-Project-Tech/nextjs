import {
	fetchProductBySlug,
	fetchProductVariations,
	fetchProducts,
	WooCommerceVariation,
  } from "@/lib/woocommerce";
  
  import ProductGallery from "@/components/ProductGallery";
  import ProductDetailPanel from "@/components/ProductDetailPanel";
  import ProductInfoAccordion from "@/components/ProductInfoAccordion";
  import Breadcrumbs from "@/components/Breadcrumbs";
  import RelatedProductsSection from "@/components/RelatedProductsSection";
  import Container from "@/components/Container";
  
  import Image from "next/image";
  import { notFound } from "next/navigation";
  import type { Metadata } from "next";
  
  import { getActivePromotions } from "@/lib/getActivePromotions";
  import { fetchGlobalPromotions } from "@/lib/promotions";
  import { fetchProductSEO } from "@/lib/wordpress";
  import { ProductCardProduct } from "@/lib/types/product";
  
  // ============================================================================
  // ISR
  // ============================================================================
  export const revalidate = 300;
  export const dynamicParams = true;
  
  // ============================================================================
  // Static params
  // ============================================================================
  export async function generateStaticParams() {
	try {
	  const result = await fetchProducts({
		per_page: 100,
		featured: true,
	  });
  
	  return (
		result?.products?.map((p: { slug: string }) => ({
		  slug: p.slug,
		})) || []
	  );
	} catch {
	  return [];
	}
  }
  
  // ============================================================================
  // Metadata
  // ============================================================================
  export async function generateMetadata(
	props: { params: Promise<{ slug: string }> }
  ): Promise<Metadata> {
	try {
	  const { slug } = await props.params;
	  const decodedSlug = decodeURIComponent(slug);
  
	  const wpProduct = await fetchProductSEO(decodedSlug);
	  const yoast = wpProduct?.yoast_head_json;
  
	  if (!yoast) {
		return { title: wpProduct?.title?.rendered || "Product" };
	  }
  
	  return {
		title: yoast.title,
		description: yoast.description,
		alternates: { canonical: yoast.canonical },
	  };
	} catch {
	  return { title: "Product" };
	}
  }
  
  // ============================================================================
  // Page
  // ============================================================================
  export default async function ProductPage(
	props: { params: Promise<{ slug: string }> }
  ) {
	const { slug } = await props.params;
	const decodedSlug = decodeURIComponent(slug);
  
	const product = await fetchProductBySlug(decodedSlug);
	if (!product) notFound();
  
	// =======================================================
	// CATEGORY
	// =======================================================
	const firstCategoryId = product.categories?.[0]?.id;
  
	// =======================================================
	// BRAND (pa_brand attribute)
  // =======================================================
	const brandAttribute = product.attributes?.find(
	  (attr: any) => attr.slug === "product_brand"
	);
  
	const currentBrandId = brandAttribute?.options?.[0]
	  ? Number(brandAttribute.options[0])
	  : undefined;
  
	// =======================================================
	// PROMOTIONS
	// =======================================================
	const promotions = await fetchGlobalPromotions();
	const categoryIds = product.categories?.map((c) => c.id) || [];
	const activePromotions = getActivePromotions(promotions, categoryIds);
  
	// =======================================================
	// VARIATIONS
	// =======================================================
	const variations: WooCommerceVariation[] =
	  product.variations?.length
		? await fetchProductVariations(product.id).catch(() => [])
		: [];
  
	// =======================================================
	// FETCH CATEGORY PRODUCTS (ONCE)
	// =======================================================
	const categoryProducts = firstCategoryId
	  ? await fetchProducts({
		  per_page: 20,
		  category: firstCategoryId,
		}).then((r) => r.products || [])
	  : [];
  
	// =======================================================
	// TOP SELLING (same category)
	// =======================================================
	const topSellingProducts = categoryProducts.slice(0, 6);
  
	// =======================================================
	// OTHER BRAND PRODUCTS (KEY LOGIC)
	// =======================================================
	const otherBrandProducts =
	  currentBrandId
		? categoryProducts.filter((p: any) => {
			const brandAttr = p.attributes?.find(
			  (attr: any) => attr.slug === "product_brand"
			);
  
			const brandId = brandAttr?.options?.[0]
			  ? Number(brandAttr.options[0])
			  : null;
  
			return brandId && brandId !== currentBrandId;
		  })
		: [];
  
	// =======================================================
	// MAPPER
	// =======================================================
	const toProductCardProduct = (p: any): ProductCardProduct => ({
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
  
	return (
	  <main id="main-content" className="min-h-screen py-12">
		{/* Breadcrumb */}
		<Container>
		  <Breadcrumbs
			items={[
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
			]}
		  />
		</Container>
  
		{/* Product header */}
		<Container className="grid grid-cols-1 gap-6 lg:grid-cols-5 mt-6">
		  <section className="lg:col-span-2">
			<ProductGallery
			  images={product.images.map((img) => ({
				id: img.id,
				src: img.src,
				alt: img.alt || product.name,
				name: img.name,
			  }))}
			/>
		  </section>
  
		  <section className="lg:col-span-2">
			<ProductDetailPanel product={product} variations={variations} />
		  </section>
  
		  <aside className="lg:col-span-1 space-y-4">
			{activePromotions.map((promo: any, i: number) => (
			  <a key={i} href={promo.link?.url}>
				<Image
				  src={promo.image?.url}
				  alt={promo.image?.alt || ""}
				  width={300}
				  height={500}
				/>
			  </a>
			))}
		  </aside>
		</Container>
  
		{/* Product info */}
		<Container className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
		  <ProductInfoAccordion product={product} variations={variations} />
		  <div className="border rounded p-4 text-sm text-gray-600">
			Reviews are loading temporarily.
		  </div>
		</Container>
  
		{/* Related products */}
		{firstCategoryId && (
		  <Container className="mt-10 space-y-10">
			<RelatedProductsSection
			  title="Top most selling products"
			  products={topSellingProducts.map(toProductCardProduct)}
			  viewAllHref={`/shop?category=${firstCategoryId}&orderby=popularity`}
			/>
  
			<RelatedProductsSection
			  title="Similar products from other brands"
			  products={otherBrandProducts
				.slice(0, 6)
				.map(toProductCardProduct)}
			  viewAllHref={
				currentBrandId
				  ? `/shop?category=${firstCategoryId}&exclude_brand=${currentBrandId}`
				  : undefined
			  }
			/>
		  </Container>
		)}
	  </main>
	);
  }
  