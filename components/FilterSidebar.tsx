"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import {
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";

/* ================= TYPES ================= */

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
}

interface Props {
  categorySlug?: string;
  brandSlug?: string;

  // 🔥 ADD THESE
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

/* ================= CACHE ================= */

const CACHE_TTL = 10 * 60 * 1000;

const cache = {
  categories: null as Category[] | null,
  allBrands: null as Brand[] | null,
  childCategories: {} as Record<string, Category[]>,
  timestamp: 0,
};

/* ================= COMPONENT ================= */

export default function FilterSidebar({ categorySlug, brandSlug, isMobileDrawer, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasFetchedInitialRef = useRef(false);
  const lastFetchedCategoryRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchingChildrenRef = useRef<Set<string>>(new Set());
  const fetchedChildrenRef = useRef<Record<string, boolean>>({});
  const brandCacheRef = useRef<Record<string, Brand[]>>({}); // ✅ NEW

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBrands, setCategoryBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({}); // ✅ changed from Set

  const [childCategories, setChildCategories] = useState<
    Record<string, Category[]>
  >(cache.childCategories);

  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(
    new Set()
  );

  /* ================= CLEANUP ================= */

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  /* ================= ACTIVE ================= */

  const activeCategory = useMemo(() => {
    if (pathname.startsWith("/product-category/")) {
      return pathname.split("/product-category/")[1]?.split("?")[0] || null;
    }
    return categorySlug || null;
  }, [pathname, categorySlug]);

  const activeBrands = useMemo(
    () => searchParams.get("brands")?.split(",").filter(Boolean) || [],
    [searchParams]
  );

  const isShopPage = !activeCategory;

  /* ================= INITIAL FETCH ================= */

  useEffect(() => {
    if (hasFetchedInitialRef.current) return;
    hasFetchedInitialRef.current = true;

    const now = Date.now();

    if (
      cache.categories &&
      now - cache.timestamp < CACHE_TTL
    ) {
      setCategories(cache.categories);
      setChildCategories(cache.childCategories);
      setLoading(false);
      return;
    }

    const fetchInitial = async () => {
      try {
        const res = await fetch("/api/filters/categories");

        if (res.ok) {
          const data = await res.json();
          cache.categories = data.categories || [];
          setCategories(cache.categories);
        }

        cache.timestamp = now;
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  /* ================= CATEGORY BRAND FETCH ================= */

  useEffect(() => {
    if (isShopPage || !activeCategory) {
      setCategoryBrands([]);
      return;
    }

    if (brandCacheRef.current[activeCategory]) {
      setCategoryBrands(brandCacheRef.current[activeCategory]);
      return;
    }

    if (lastFetchedCategoryRef.current === activeCategory) return;
    lastFetchedCategoryRef.current = activeCategory;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchBrands = async () => {
      setBrandsLoading(true);
      setCategoryBrands([]);

      try {
        const res = await fetch(
          `/api/filters/brands?category=${activeCategory}`,
          { signal: controller.signal }
        );

        const data = await res.json();
        const brands = data.brands || [];

        brandCacheRef.current[activeCategory] = brands; // ✅ cache
        setCategoryBrands(brands);
      } catch (e: any) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setBrandsLoading(false);
      }
    };

    fetchBrands();
  }, [activeCategory, isShopPage]);

  /* ================= URL ================= */

  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([k, v]) =>
        v ? params.set(k, v) : params.delete(k)
      );

      const newUrl = `${pathname}?${params.toString()}`;
      const currentUrl = `${pathname}?${searchParams.toString()}`;

      if (newUrl !== currentUrl) {
        router.replace(newUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams]
  );

  const handleBrandToggle = (slug: string) => {
    const updated = activeBrands.includes(slug)
      ? activeBrands.filter((b) => b !== slug)
      : [...activeBrands, slug];

    updateURL({
      brands: updated.length ? updated.join(",") : null,
    });
  };

  /* ================= CHILD FETCH ================= */

  const fetchChildCategories = useCallback(
    (slug: string) => {
      if (childCategories[slug]) return;
      if (fetchedChildrenRef.current[slug]) return;
      if (fetchingChildrenRef.current.has(slug)) return;

      fetchedChildrenRef.current[slug] = true;
      fetchingChildrenRef.current.add(slug);

      setLoadingChildren((prev) => new Set(prev).add(slug));

      fetch(`/api/filters/categories?category=${slug}`)
        .then((res) => res.json())
        .then((data) => {
          const children = data.categories || [];

          setChildCategories((prev) => {
            const updated = { ...prev, [slug]: children };
            cache.childCategories = updated; // ✅ persist cache
            return updated;
          });
        })
        .finally(() => {
          setLoadingChildren((prev) => {
            const next = new Set(prev);
            next.delete(slug);
            return next;
          });
          fetchingChildrenRef.current.delete(slug);
        });
    },
    [childCategories]
  );

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));

    fetchChildCategories(slug);
  };

  /* ================= RENDER ================= */

  if (loading) return <div className="p-4">Loading filters...</div>;

  return (
    <aside className="space-y-4">

      {/* CATEGORY */}
      <div>
        <h3 className="font-semibold mb-2">Department</h3>

        {(categories || []).map((c) => {
          const children = childCategories[c.slug];
          const expanded = expandedCategories[c.slug];

          return (
            <div key={c.slug} className="mb-2">

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={() => toggleCategory(c.slug)}
                  className="text-xs"
                >
                  {expanded ? "▼" : "▶"}
                </button>

                <Link
                  href={`/product-category/${c.slug}`}
                  className={`text-sm ${
                    activeCategory === c.slug
                      ? "text-orange-600 font-semibold"
                      : ""
                  }`}
                >
                  {c.name}
                </Link>
              </div>

              {expanded && (
                <div className="ml-4 mt-1">
                  {loadingChildren.has(c.slug) ? (
                    <p className="text-xs">Loading...</p>
                  ) : children?.length ? (
                    children.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/product-category/${sub.slug}`}
                        className="block text-sm text-gray-600 hover:text-teal-600"
                      >
                        - {sub.name}
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">
                      No subcategories
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BRANDS */}
      {!isShopPage && (
        <div>
          <h3 className="font-semibold mb-2">Brand</h3>

          {brandsLoading ? (
            <p>Loading...</p>
          ) : categoryBrands.length === 0 ? (
            <p className="text-sm text-gray-500">
              No brands found
            </p>
          ) : (
            categoryBrands.map((b) => (
              <label key={b.slug} className="block text-sm">
                <input
                  type="checkbox"
                  checked={activeBrands.includes(b.slug)}
                  onChange={() => handleBrandToggle(b.slug)}
                />
                <span className="ml-2">{b.name}</span>
              </label>
            ))
          )}
        </div>
      )}

      {/* CLEAR */}
      <button
        onClick={() => router.replace(pathname.split("?")[0])}
        className="text-sm text-orange-600 underline"
      >
        Clear all
      </button>
    </aside>
  );
}