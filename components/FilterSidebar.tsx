"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";

/* ============================================================================
   Types
============================================================================ */

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

interface FilterSidebarProps {
  categorySlug?: string;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

/* ============================================================================
   Global Cache (module scoped)
============================================================================ */

const CACHE_TTL = 10 * 60 * 1000;

const cache = {
  categories: null as Category[] | null,
  allBrands: null as Brand[] | null,
  childCategories: {} as Record<string, Category[]>,
  parentMap: {} as Record<string, string>,
  timestamp: 0,
};

/* ============================================================================
   Main Component
============================================================================ */

export default function FilterSidebar({
  categorySlug,
  isMobileDrawer = false,
  onClose,
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sidebarRef = useRef<HTMLElement | null>(null);

  const fetchingBrandsRef = useRef<string | null>(null);
  const fetchingChildrenRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [categoryBrands, setCategoryBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);

  const [expandedSections, setExpandedSections] = useState(
    new Set(["category", "brand"])
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [childCategories, setChildCategories] = useState<
    Record<string, Category[]>
  >(cache.childCategories);
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(
    new Set()
  );

  /* ============================================================================
     Keyboard + Focus (Mobile Drawer)
  ============================================================================ */

  useEffect(() => {
    if (!isMobileDrawer) return;

    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [isMobileDrawer, onClose]);

  useEffect(() => {
    if (!isMobileDrawer || !sidebarRef.current) return;
    const el = sidebarRef.current.querySelector<HTMLElement>("button, input");
    el?.focus();
  }, [isMobileDrawer]);

  /* ============================================================================
     Active Filters
  ============================================================================ */

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

  /* ============================================================================
     Initial Fetch (Cached)
  ============================================================================ */

  useEffect(() => {
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
        console.error("Filter fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, []);

  /* ============================================================================
     Category Specific Brands (Safe)
  ============================================================================ */

  useEffect(() => {
    if (isShopPage || !activeCategory) {
      setCategoryBrands([]);
      return;
    }

    if (fetchingBrandsRef.current === activeCategory) return;
    fetchingBrandsRef.current = activeCategory;

    const current = activeCategory;

    const fetchBrands = async () => {
      setBrandsLoading(true);
      try {
        const res = await fetch(
          `/api/filters/brands?category=${encodeURIComponent(current)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (current === activeCategory) {
          setCategoryBrands(data.brands || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        fetchingBrandsRef.current = null;
        setBrandsLoading(false);
      }
    };

    fetchBrands();
  }, [activeCategory, isShopPage]);

  /* ============================================================================
     URL Helpers
  ============================================================================ */

  const updateURL = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) =>
        v ? params.set(k, v) : params.delete(k)
      );
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleCategoryClick = useCallback(
    (slug: string) => {
      router.push(`/product-category/${slug}`, { scroll: false });
    },
    [router]
  );

  const handleBrandToggle = useCallback(
    (slug: string) => {
      const updated = activeBrands.includes(slug)
        ? activeBrands.filter((b) => b !== slug)
        : [...activeBrands, slug];

      updateURL({
        brands: updated.length ? updated.join(",") : null,
      });
    },
    [activeBrands, updateURL]
  );

  const handleClearAll = () => {
    router.replace("/shop", { scroll: false });
  };

  /* ============================================================================
     Derived
  ============================================================================ */

  const displayBrands = useMemo(
    () => (isShopPage ? allBrands : categoryBrands),
    [isShopPage, allBrands, categoryBrands]
  );

  if (loading) {
    return <aside className="w-full lg:w-64 animate-pulse h-64 bg-gray-100" />;
  }

  /* ============================================================================
     Render
  ============================================================================ */

  return (
    <aside
      ref={sidebarRef}
      className="w-full lg:w-64 space-y-3"
      aria-label="Filters"
    >
      {isMobileDrawer && (
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="font-bold">Filters</h2>
          <button onClick={onClose}>✕</button>
        </div>
      )}

      <FilterSection
        title="Department"
        isExpanded={expandedSections.has("category")}
        onToggle={() =>
          setExpandedSections((s) =>
            new Set(s.has("category") ? [...s].filter((x) => x !== "category") : [...s, "category"])
          )
        }
      >
        <ul className="space-y-1">
          {categories.map((c) => (
            <li key={c.id}>
              <button
                className={`text-sm ${
                  activeCategory === c.slug
                    ? "font-semibold text-orange-700"
                    : "text-gray-700"
                }`}
                onClick={() => handleCategoryClick(c.slug)}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      </FilterSection>

      <FilterSection
        title="Brand"
        isExpanded={expandedSections.has("brand")}
        onToggle={() =>
          setExpandedSections((s) =>
            new Set(s.has("brand") ? [...s].filter((x) => x !== "brand") : [...s, "brand"])
          )
        }
      >
        {brandsLoading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <ul className="space-y-1">
            {displayBrands.map((b) => (
              <li key={b.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={activeBrands.includes(b.slug)}
                    onChange={() => handleBrandToggle(b.slug)}
                  />
                  <span className="text-sm">{b.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </FilterSection>

      {(activeCategory || activeBrands.length > 0) && (
        <button
          onClick={handleClearAll}
          className="text-sm text-orange-600 underline"
        >
          Clear all
        </button>
      )}
    </aside>
  );
}

/* ============================================================================
   Sub Components
============================================================================ */

function FilterSection({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b pb-3">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center font-semibold text-sm"
        aria-expanded={isExpanded}
      >
        {title}
        <span>{isExpanded ? "−" : "+"}</span>
      </button>
      {isExpanded && <div className="mt-2">{children}</div>}
    </div>
  );
}
