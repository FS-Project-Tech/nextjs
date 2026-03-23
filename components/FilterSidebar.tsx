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

export default function FilterSidebar({ categorySlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasFetchedInitialRef = useRef(false);
  const lastFetchedCategoryRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchingChildrenRef = useRef<Set<string>>(new Set());
  const fetchedChildrenRef = useRef<Record<string, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [categoryBrands, setCategoryBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

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
      cache.allBrands &&
      now - cache.timestamp < CACHE_TTL
    ) {
      setCategories(cache.categories);
      setAllBrands(cache.allBrands);
      setChildCategories(cache.childCategories);
      setLoading(false);
      return;
    }

    const fetchInitial = async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/filters/categories"),
          fetch("/api/filters/brands"),
        ]);

        if (catRes.ok) {
          const data = await catRes.json();
          cache.categories = data.categories || [];
          setCategories(cache.categories);
        }

        if (brandRes.ok) {
          const data = await brandRes.json();
          cache.allBrands = data.brands || [];
          setAllBrands(cache.allBrands);
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
        setCategoryBrands(data.brands || []);
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
          setChildCategories((prev) => ({
            ...prev,
            [slug]: data.categories || [],
          }));
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
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });

    fetchChildCategories(slug);
  };

  /* ================= RENDER ================= */

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <aside className="space-y-4">

      {/* CATEGORY */}
      <div>
        <h3 className="font-semibold mb-2">Department</h3>

        {categories.map((c) => {
          const children = childCategories[c.slug];
          const expanded = expandedCategories.has(c.slug);

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

                {/* ✅ FIXED NAVIGATION */}
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
                  ) : (
                    children?.map((sub) => (
                      <Link
                        key={sub.slug}
                        href={`/product-category/${sub.slug}`}
                        className="block text-sm text-gray-600"
                      >
                        - {sub.name}
                      </Link>
                    ))
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
        onClick={() => router.replace("/shop")}
        className="text-sm text-orange-600 underline"
      >
        Clear all
      </button>
    </aside>
  );
}