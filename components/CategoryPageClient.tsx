"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
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

interface CategoryResponse {
  category?: {
    name: string;
    description?: string;
  };
}

export default function CategoryPageClient({
  initialSlug,
  initialCategoryName,
  initialCategoryDescription = "",
}: {
  initialSlug: string;
  initialCategoryName?: string;
  initialCategoryDescription?: string;
}) {
  const [categoryName, setCategoryName] = useState(
    initialCategoryName || "Category"
  );
  const [categoryDesc, setCategoryDesc] = useState(initialCategoryDescription);
  const [expanded, setExpanded] = useState(false);

  const categorySlug = initialSlug;

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

      setCategoryDesc(json.category?.description || "");
    } catch (error) {
      console.error("Category fetch error:", error);
    }
  }, []);

  useEffect(() => {
    if (!initialCategoryDescription && categorySlug) {
      fetchCategoryData(categorySlug);
    }
  }, [categorySlug, initialCategoryDescription, fetchCategoryData]);

  const showReadMore = categoryDesc.replace(/<[^>]*>/g, "").trim().length > 180;

  return (
    <div className="min-h-screen py-6">
      <Container>
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="flex-shrink-0 lg:w-64">
            <FilterSidebar
              categorySlug={categorySlug}
              isMobileDrawer={false}
            />
          </aside>

          <div className="flex-1">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Shop", href: "/shop" },
                { label: categoryName },
              ]}
            />

            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              {categoryName}
            </h1>

            {categoryDesc && (
              <div className="mt-3 mb-4 text-sm leading-relaxed text-gray-600">
                <div
                  className={expanded || !showReadMore ? "" : "line-clamp-3"}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(categoryDesc),
                  }}
                />

                {showReadMore && (
                  <button
                    onClick={() => setExpanded((prev) => !prev)}
                    className="mt-2 font-medium text-orange-600 hover:underline"
                  >
                    {expanded ? "Read Less" : "Read More"}
                  </button>
                )}
              </div>
            )}

            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid categorySlug={categorySlug} />
            </Suspense>
          </div>
        </div>
      </Container>
    </div>
  );
}