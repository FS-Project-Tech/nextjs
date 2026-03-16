"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import DOMPurify from "dompurify";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductGrid from "@/components/ProductGrid";
import ProductGridSkeleton from "@/components/skeletons/ProductGridSkeleton";
import FilterSidebarSkeleton from "@/components/skeletons/FilterSidebarSkeleton";
import Container from "@/components/Container";

const FilterSidebar = dynamic(() => import("@/components/FilterSidebar"), {
  loading: () => <FilterSidebarSkeleton />,
  ssr: false,
});

export default function BrandPageClient({
  brandSlug,
  brandName,
  brandDescription,
}: {
  brandSlug: string;
  brandName: string;
  brandDescription?: string | null;
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFiltersOpen]);

  const safeDescription = brandDescription
    ? DOMPurify.sanitize(brandDescription)
    : "";

  return (
    <div className="min-h-screen py-8">
      <Container>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: "Brands", href: "/brands" },
            { label: brandName },
          ]}
        />

        <div className="mt-6 mb-8 w-full">
          <h1 className="text-3xl font-bold text-gray-900">{brandName}</h1>

          {safeDescription && (
            <div
              className="mt-4 w-full text-sm leading-relaxed text-gray-600"
              dangerouslySetInnerHTML={{ __html: safeDescription }}
            />
          )}

          <div className="mt-4 h-1 w-20 rounded-full bg-teal-600" />
        </div>

        <div className="sticky top-[72px] z-40 -mx-4 mb-4 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-expanded={mobileFiltersOpen}
            aria-controls="brand-mobile-filter-drawer"
          >
            <svg
              className="h-5 w-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>Filters</span>
          </button>
        </div>

        {mobileFiltersOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/50 lg:hidden animate-in fade-in duration-200"
              onClick={() => setMobileFiltersOpen(false)}
              aria-hidden
            />
            <div
              id="brand-mobile-filter-drawer"
              className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white shadow-xl lg:hidden animate-in slide-in-from-left duration-300"
              role="dialog"
              aria-modal="true"
              aria-label="Filter products"
            >
              <div className="h-full overflow-y-auto p-4 pb-24">
                <FilterSidebar
                  brandSlug={brandSlug}
                  isMobileDrawer
                  onClose={() => setMobileFiltersOpen(false)}
                />
              </div>

              <div className="absolute right-0 bottom-0 left-0 border-t border-gray-200 bg-white p-4">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="w-full rounded-lg bg-teal-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="hidden flex-shrink-0 lg:block lg:w-64">
            <div className="sticky top-24">
              <FilterSidebar brandSlug={brandSlug} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid brandSlug={brandSlug} />
            </Suspense>
          </div>
        </div>
      </Container>
    </div>
  );
}