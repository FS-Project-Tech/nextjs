import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { WebsiteStructuredData, OrganizationStructuredData } from "@/components/StructuredData";
import HeroDualSliderServer from "@/components/HeroDualSliderServer";

// ============================================================================
// ISR Configuration - Revalidate homepage every 5 minutes
// ============================================================================
export const revalidate = 300; // 5 minutes

// SEO Metadata for homepage
export const metadata: Metadata = {
  title: "Home",
  description: "Shop the latest products at our WooCommerce store. Fast, secure checkout with free shipping on orders over $50.",
  openGraph: {
    title: "WooCommerce Store - Shop Latest Products",
    description: "Shop the latest products at our WooCommerce store. Fast, secure checkout with free shipping.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

// Import ProductsPageClientWrapper - client component wrapper that handles dynamic import
import ProductsPageClientWrapper from "@/components/ProductsPageClientWrapper";
//  import { bgGradient } from "tailwindcss/defaultTheme";
import ProductSection from "@/components/ProductSection";
import RecommendedSection from "@/components/RecommendedSection";
import CategoriesSection from "@/components/CategoriesSection";
import MarketingUpdatesSection from "@/components/MarketingUpdatesSection";
import NDISCTASection from "@/components/NDISCTASection";
import RecentlyViewedSection from "@/components/RecentlyViewedSection";
import TrendingSection from "@/components/TrendingSection";
import NewsletterSection from "@/components/NewsletterSection";
// import MedicalBackgroundPattern from "@/components/MedicalBackgroundPattern";
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

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
      {/* Medical Background Pattern */}
      {/* <MedicalBackgroundPattern /> */}
      
      {/* Header dual sliders */}
      <AnimatedSection>
        <div className="py-4">
          <HeroDualSliderServer />
        </div>
      </AnimatedSection>

      {/* Personalized recommendations */}
      <AnimatedSection>
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
          <RecommendedSection />
        </Suspense>
      </AnimatedSection>

      {/* Categories Section */}
      <AnimatedSection>
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded mb-10" />}>
          <CategoriesSection />
        </Suspense>
      </AnimatedSection>

      {/* Recently viewed */}
      <AnimatedSection>
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
          <RecentlyViewedSection />
        </Suspense>
      </AnimatedSection>

      {/* Clearance products (on sale) */}
      {/* <AnimatedSection>
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
          <TrendingSection />
        </Suspense>
      </AnimatedSection> */}

      {/* Marketing & Updates Section */}
      <AnimatedSection>
        <MarketingUpdatesSection />
      </AnimatedSection>

      {/* NDIS CTA Section */}
      <AnimatedSection>
        <NDISCTASection />
      </AnimatedSection>

      {/* Sections */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
        <ProductSection
          title="Continence care products"
          subtitle="Trusted protection for daily confidence. Explore our bestsellers."
          viewAllHref={`/product-category/${encodeURIComponent(continenceSlug)}`}
          bgClassName="bg-rose-50"
          query={{ categorySlug: continenceSlug }}
        />
      </Suspense>

      {/* Clearance products (on sale) */}
      <AnimatedSection>
        <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
          <TrendingSection />
        </Suspense>
      </AnimatedSection>

      {/* Interstitial CTA banner (hidden on mobile) */}
      <div className="hidden sm:block mx-auto w-[85vw] px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 to-gray-700 p-8">
          <div className="max-w-xl">
            <h3 className="text-2xl font-bold text-white">Save more with bundles</h3>
            <p className="mt-2 text-gray-200">Mix-and-match essentials and get extra discounts at checkout.</p>
            <Link href="/shop" className="mt-4 inline-flex rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100">Shop Now</Link>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        </div>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
        <ProductSection
          title="Latest Published"
          subtitle="Fresh arrivals straight from our catalog. Updated regularly."
          viewAllHref="/shop?orderby=date&order=desc"
          bgClassName="bg-sky-50"
          query={{ orderby: "date", order: "desc" }}
        />
      </Suspense>

      {/* Interstitial image/banner (hidden on mobile) */}
      <div className="hidden sm:block mx-auto w-[85vw] px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative overflow-hidden rounded-2xl">
          <img src="https://picsum.photos/1600/320?random=21" alt="Promotional banner" className="h-40 w-full object-cover" />
        </div>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
        <ProductSection
          title="Featured Products"
          subtitle="Handpicked favorites our customers love the most."
          viewAllHref="/shop?featured=true"
          bgClassName="bg-emerald-50"
          query={{ featured: true }}
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
