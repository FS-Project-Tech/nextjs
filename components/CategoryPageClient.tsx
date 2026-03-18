"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProductGrid from "@/components/ProductGrid";
import ProductGridSkeleton from "@/components/skeletons/ProductGridSkeleton";
import FilterSidebarSkeleton from "@/components/skeletons/FilterSidebarSkeleton";
import Container from "@/components/Container";

// Dynamically import FilterSidebar - heavy component with filters and sliders
const FilterSidebar = dynamic(() => import("@/components/FilterSidebar"), {
  loading: () => <FilterSidebarSkeleton />,
  ssr: false, // Client-side only for filters
});

// Extract slug from pathname
function extractSlugFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  return pathname.startsWith('/product-category/') 
    ? pathname.split('/product-category/')[1]?.split('/')[0] ?? null
    : null;
}

interface CategoryResponse {
  category?: { name: string };
}

export default function CategoryPageClient({ 
  initialSlug,
  initialCategoryName 
}: { 
  initialSlug: string;
  initialCategoryName?: string;
}) {
  const pathname = usePathname();
  const [categoryName, setCategoryName] = useState(initialCategoryName || "Category");
  
  // Derive slug from pathname or use initial - no state needed
  const slugFromPath = extractSlugFromPath(pathname);
  const categorySlug = slugFromPath || initialSlug;

  // Fetch category name when slug changes
  const fetchCategoryName = useCallback(async (slug: string) => {
    if (slug === initialSlug && initialCategoryName) return;
    
    try {
      const res = await fetch(`/api/category-by-slug?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) return;
      
      const json: CategoryResponse = await res.json();
      if (json.category?.name) {
        setCategoryName(json.category.name);
      }
    } catch {
      // Keep existing name on error
    }
  }, [initialSlug, initialCategoryName]);

  // Effect to fetch category name when slug changes
  useEffect(() => {
    if (categorySlug && (categorySlug !== initialSlug || !initialCategoryName)) {
      fetchCategoryName(categorySlug);
    }
  }, [categorySlug, initialSlug, initialCategoryName, fetchCategoryName]);

  return (
    <div className="min-h-screen py-12" suppressHydrationWarning>
      <Container suppressHydrationWarning>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: categoryName }]} />
        
        <div className="mb-6" suppressHydrationWarning>
          <h1 className="text-2xl font-semibold text-gray-900">{categoryName}</h1>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6" suppressHydrationWarning>
          {/* Filter Sidebar */}
          <aside className="lg:w-64 flex-shrink-0" suppressHydrationWarning>
            <FilterSidebar categorySlug={categorySlug} />
          </aside>
          
          {/* Product Grid - Wrapped in Suspense for useSearchParams */}
          <div className="flex-1" suppressHydrationWarning>
            <Suspense fallback={<ProductGridSkeleton />}>
              <ProductGrid categorySlug={categorySlug || undefined} />
            </Suspense>
          </div>
        </div>
      </Container>
    </div>
  );
}

