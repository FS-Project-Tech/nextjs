import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { WebsiteStructuredData, OrganizationStructuredData } from "@/components/StructuredData";
import HeroDualSliderServer from "@/components/HeroDualSliderServer";
// import { getYoastMeta } from "@/lib/yoast";

// ============================================================================
// ISR Configuration - Revalidate homepage every 5 minutes
// ============================================================================
export const revalidate = 300; // 5 minutes

// SEO Metadata for homepage
// export async function generateMetadata(): Promise<Metadata> {
//   const siteUrl = process.env.NEXT_PUBLIC_WP_URL || "https://example.com";

//   const yoast = await getYoastMeta(siteUrl);

//   if (!yoast) {
//     return {
//       title: "Home",
//       description: "Shop our WooCommerce store",
//     };
//   }

//   return {
//     title: yoast.json.title,
//     description: yoast.json.description,
//     openGraph: {
//       title: yoast.json.og_title,
//       description: yoast.json.og_description,
//       images: yoast.json.og_image?.map((img: any) => img.url),
//     },
//     robots: {
//       index: yoast.json.robots?.index === "index",
//       follow: yoast.json.robots?.follow === "follow",
//     },
//   };
// }

// Import ProductsPageClientWrapper - client component wrapper that handles dynamic import
import ProductsPageClientWrapper from "@/components/ProductsPageClientWrapper";
//  import { bgGradient } from "tailwindcss/defaultTheme";
import ProductSection from "@/components/ProductSection";
import CategoriesSection from "@/components/CategoriesSection";
import MarketingUpdatesSection from "@/components/MarketingUpdatesSection";
import NDISCTASection from "@/components/NDISCTASection";
import TrendingSection from "@/components/TrendingSection";
import NewsletterSection from "@/components/NewsletterSection";
import AnimatedSection from "@/components/AnimatedSection";
import HomePageClient from "@/components/HomePageClient";


export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ Search?: string; search?: string }>;
}) {
  const continenceSlug = process.env.NEXT_PUBLIC_CONTINENCE_CATEGORY_SLUG || "continence-care";
  
  const params = await searchParams;
  const searchQuery = params?.Search || params?.search;

  // If search query exists, show search results page
  if (searchQuery) {
    return <ProductsPageClientWrapper />;
  }

  const siteUrl = process.env.NEXT_PUBLIC_WP_URL || 'https://example.com';

  return (
    <>
      {/* Structured Data for SEO */}
      <WebsiteStructuredData 
        siteUrl={siteUrl}
        potentialAction={{
          "@type": "SearchAction",
          target: `${siteUrl}/?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        }}
      />
      <OrganizationStructuredData siteUrl={siteUrl} />
      
      <HomePageClient continenceSlug={continenceSlug}>
      <div className="min-h-screen relative" suppressHydrationWarning>
      
      {/* Header dual sliders */}
      <AnimatedSection>
        <div className="py-4">
          <HeroDualSliderServer />
        </div>
      </AnimatedSection>

      {/* Categories Section */}
      <AnimatedSection>
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded mb-10" />}>
          <CategoriesSection />
        </Suspense>
      </AnimatedSection>

      {/* Marketing & Updates Section */}
      <AnimatedSection>
        <MarketingUpdatesSection />
      </AnimatedSection>

      {/* Sections */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
        <ProductSection
          title="Continence care products"
          subtitle="Trusted protection for daily confidence. Explore our bestsellers."
          viewAllHref={`/product-category/${encodeURIComponent(continenceSlug)}`}
          query={{ categorySlug: continenceSlug }}
        />
      </Suspense>

      {/* NDIS CTA Section */}
      <AnimatedSection>
        <NDISCTASection />
      </AnimatedSection>

      {/* Clearance products (on sale) */}
      <AnimatedSection>
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
          <TrendingSection />
        </Suspense>
      </AnimatedSection>

      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
        <ProductSection
          title="Latest Published"
          subtitle="Fresh arrivals straight from our catalog. Updated regularly."
          viewAllHref="/shop?orderby=date&order=desc"
          query={{ orderby: "date", order: "desc" }}
        />
      </Suspense>
      {/* Newsletter */}
      <AnimatedSection>
        <NewsletterSection />
      </AnimatedSection>
      
    </div>
    </HomePageClient>
    </>
  );
}
