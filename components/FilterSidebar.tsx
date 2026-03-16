"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

/* ----------------------------
Types
---------------------------- */

interface Category {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

interface Props {
  categorySlug?: string;
  brandSlug?: string;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

/* ----------------------------
Component
---------------------------- */

export default function FilterSidebar({
  categorySlug,
  brandSlug,
  isMobileDrawer,
  onClose,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [childCategories, setChildCategories] = useState<
    Record<string, Category[]>
  >({});
  const [brands, setBrands] = useState<Brand[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  /* ----------------------------
  Active Filters
  ---------------------------- */

  const activeCategory = pathname.includes("/product-category/")
    ? pathname.split("/product-category/")[1]
    : categorySlug || null;

  const activeBrandPage = pathname.includes("/brands/")
    ? pathname.split("/brands/")[1]
    : brandSlug || null;

  const activeBrands =
    searchParams.get("brands")?.split(",").filter(Boolean) || [];

  /* ----------------------------
  Fetch Categories
  ---------------------------- */

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/filters/categories");
        const data = await res.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  /* ----------------------------
  Fetch Brands based on Category
  ---------------------------- */

  useEffect(() => {
    if (!activeCategory) {
      setBrands([]);
      return;
    }

    async function loadBrands() {
      try {
        const res = await fetch(`/api/filters/brands?category=${activeCategory}`);
        const data = await res.json();
        setBrands(data.brands || []);
      } catch (err) {
        console.error(err);
      }
    }

    loadBrands();
  }, [activeCategory]);

  /* ----------------------------
  Fetch Subcategories
  ---------------------------- */

  async function loadChildren(slug: string) {
    if (childCategories[slug]) return;

    try {
      const res = await fetch(`/api/filters/categories?category=${slug}`);
      const data = await res.json();

      setChildCategories((prev) => ({
        ...prev,
        [slug]: data.categories || [],
      }));
    } catch (err) {
      console.error(err);
    }
  }

  /* ----------------------------
  Handlers
  ---------------------------- */

  function toggleCategory(slug: string) {
    const next = new Set(expanded);

    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
      loadChildren(slug);
    }

    setExpanded(next);
  }

  function goCategory(slug: string) {
    router.push(`/product-category/${slug}`);
    if (isMobileDrawer && onClose) {
      onClose();
    }
  }

  function toggleBrand(slug: string) {
    const updated = activeBrands.includes(slug)
      ? activeBrands.filter((b) => b !== slug)
      : [...activeBrands, slug];

    const params = new URLSearchParams(searchParams.toString());

    if (updated.length) {
      params.set("brands", updated.join(","));
    } else {
      params.delete("brands");
    }

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function clearFilters() {
    if (activeCategory) {
      router.replace(`/product-category/${activeCategory}`);
      return;
    }

    if (activeBrandPage) {
      router.replace(`/brands/${activeBrandPage}`);
      return;
    }

    router.replace("/shop");
  }

  /* ----------------------------
  Loading
  ---------------------------- */

  if (loading) {
    return (
      <div className="w-64 animate-pulse space-y-3">
        <div className="h-4 w-32 rounded bg-gray-200"></div>
        <div className="h-4 w-40 rounded bg-gray-200"></div>
        <div className="h-4 w-36 rounded bg-gray-200"></div>
      </div>
    );
  }

  /* ----------------------------
  Render
  ---------------------------- */

  return (
    <aside className="w-full space-y-6 text-sm lg:w-64">
      <div className="border-b pb-4">
        <h3 className="mb-3 font-semibold">Department</h3>

        <ul className="space-y-1">
          {categories.map((cat) => {
            const isOpen = expanded.has(cat.slug);
            const children = childCategories[cat.slug];

            return (
              <li key={cat.slug}>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleCategory(cat.slug)}
                    className="w-5 text-gray-500"
                    type="button"
                  >
                    {isOpen ? "▾" : "▸"}
                  </button>

                  <button
                    onClick={() => goCategory(cat.slug)}
                    type="button"
                    className={`flex-1 text-left ${
                      activeCategory === cat.slug
                        ? "font-semibold text-orange-600"
                        : "text-gray-700 hover:text-orange-600"
                    }`}
                  >
                    {cat.name}
                  </button>
                </div>

                {isOpen && children && (
                  <ul className="mt-1 ml-5 space-y-1 border-l pl-3">
                    {children.map((sub) => (
                      <li key={sub.slug}>
                        <button
                          onClick={() => goCategory(sub.slug)}
                          type="button"
                          className={`text-left ${
                            activeCategory === sub.slug
                              ? "font-semibold text-orange-600"
                              : "text-gray-600 hover:text-orange-600"
                          }`}
                        >
                          {sub.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {activeCategory && (
        <div className="border-b pb-4">
          <h3 className="mb-3 font-semibold">Brand</h3>

          {brands.length === 0 ? (
            <p className="text-sm text-gray-400">No brands available</p>
          ) : (
            <ul className="space-y-1">
              {brands.map((brand) => (
                <li key={brand.slug}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activeBrands.includes(brand.slug)}
                      onChange={() => toggleBrand(brand.slug)}
                      className="accent-orange-600"
                    />

                    <span>{brand.name}</span>

                    {brand.count ? (
                      <span className="text-xs text-gray-400">
                        ({brand.count})
                      </span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(activeCategory || activeBrandPage || activeBrands.length > 0) && (
        <button
          onClick={clearFilters}
          type="button"
          className="text-sm text-orange-600 hover:underline"
        >
          Clear filters
        </button>
      )}
    </aside>
  );
}