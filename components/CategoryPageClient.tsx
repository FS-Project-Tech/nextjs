"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import DOMPurify from "dompurify";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductGrid from "@/components/ProductGrid";
import ProductGridSkeleton from "@/components/skeletons/ProductGridSkeleton";
import FilterSidebarSkeleton from "@/components/skeletons/FilterSidebarSkeleton";
import Container from "@/components/Container";

// Dynamically import FilterSidebar
const FilterSidebar = dynamic(() => import("@/components/FilterSidebar"), {
  loading: () => <FilterSidebarSkeleton />,
  ssr: false,
});

// Extract slug from pathname
function extractSlugFromPath(pathname: string | null): string | null {
  if (!pathname) return null;

  return pathname.startsWith("/product-category/")
    ? pathname.split("/product-category/")[1]?.split("/")[0] ?? null
    : null;
}

interface CategoryResponse {
  category?: {
    name: string;
    description?: string;
  };
}

export default function CategoryPageClient({
  initialSlug,
  initialCategoryName,
}: {
  initialSlug: string;
  initialCategoryName?: string;
}) {
  const pathname = usePathname();

  const [categoryName, setCategoryName] = useState(
    initialCategoryName || "Category"
  );

  const [categoryDesc, setCategoryDesc] = useState("");

  const slugFromPath = extractSlugFromPath(pathname);
  const categorySlug = slugFromPath || initialSlug;
  const [expanded, setExpanded] = useState(false);

  // Fetch category data
  const fetchCategoryData = useCallback(async (slug: string) => {
    try {
      const res = await fetch(
        `/api/category-by-slug?slug=${encodeURIComponent(slug)}`
      );

      if (!res.ok) return;

      const json: CategoryResponse = await res.json();

      if (json.category?.name) {
        setCategoryName(json.category.name);
      }

      if (json.category?.description) {
        setCategoryDesc(json.category.description);
      }
    } catch (error) {
      console.error("Category fetch error:", error);
    }
  }, []);

  // Always fetch category data
  useEffect(() => {
    if (!categoryDesc && categorySlug) {
      fetchCategoryData(categorySlug);
    }
  }, [categorySlug, categoryDesc, fetchCategoryData]);

  return (
    <div className="min-h-screen py-6">
      <Container>
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT FILTER SIDEBAR */}
          <aside className="lg:w-64 flex-shrink-0">
            <FilterSidebar categorySlug={categorySlug} />
          </aside>

          {/* RIGHT CONTENT */}
          <div className="flex-1">
            
            {/* Breadcrumb */}
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Shop", href: "/shop" },
                { label: categoryName },
              ]}
            />

            {/* Category Title */}
            <h1 className="text-2xl font-semibold text-gray-900 mt-2">
              {categoryName}
            </h1>

            {/* Category Description */}
            {categoryDesc && (
              <div className="mt-3 mb-4 text-sm text-gray-600 leading-relaxed">

              <div
                className={expanded ? "" : "line-clamp-3"}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(categoryDesc),
                }}
              />
        
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-orange-600 font-medium hover:underline"
              >
                {expanded ? "Read Less" : "Read More"}
              </button>
        
            </div>
            )}

            {/* Product Grid */}
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid categorySlug={categorySlug || undefined} />
            </Suspense>
          </div>
        </div>
      </Container>
    </div>
  );
}