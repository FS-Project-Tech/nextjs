"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// ============================================================================
// Types
// ============================================================================

interface Category {
  id: number;
  name: string;
  slug: string;
  count?: number;
  parent?: number;
}

interface Brand {
  id: number;
  name: string;
  slug: string;
  count?: number;
}

interface FilterSidebarProps {
  categorySlug?: string;
  /** Mobile drawer mode */
  isMobileDrawer?: boolean;
  /** Callback when drawer should close */
  onClose?: () => void;
}

// ============================================================================
// Global Cache (persists across renders and navigation)
// ============================================================================

const cache = {
  categories: null as Category[] | null,
  allBrands: null as Brand[] | null,
  childCategories: {} as Record<string, Category[]>, // slug -> children
  parentMap: {} as Record<string, string>, // child slug -> parent slug
  timestamp: 0,
};

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// Main Component
// ============================================================================

export default function FilterSidebar({ categorySlug, isMobileDrawer = false, onClose }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // State
  const [categories, setCategories] = useState<Category[]>(cache.categories || []);
  const [allBrands, setAllBrands] = useState<Brand[]>(cache.allBrands || []);
  const [categoryBrands, setCategoryBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(!cache.categories);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["category", "brand"])
  );
  const [childCategories, setChildCategories] = useState<Record<string, Category[]>>(cache.childCategories);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set());
  
  // Refs to prevent duplicate fetches
  const fetchingBrandsRef = useRef<string | null>(null);
  const fetchingChildrenRef = useRef<Set<string>>(new Set());
  const sidebarRef = useRef<HTMLElement>(null);

  // Handle escape key for mobile drawer
  useEffect(() => {
    if (!isMobileDrawer) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileDrawer, onClose]);

  // Focus trap for mobile drawer
  useEffect(() => {
    if (!isMobileDrawer || !sidebarRef.current) return;
    
    const sidebar = sidebarRef.current;
    const focusableElements = sidebar.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [isMobileDrawer]);

  // ============================================================================
  // Parse current filters from URL
  // ============================================================================
  
  const activeCategory = useMemo(() => {
    if (pathname?.startsWith('/product-category/')) {
      const match = pathname.match(/\/product-category\/([^\/]+)/);
      if (match) return match[1];
    }
    return categorySlug || null;
  }, [pathname, categorySlug]);

  const activeBrands = useMemo(() => {
    return searchParams.get("brands")?.split(",").filter(Boolean) || [];
  }, [searchParams]);

  const isShopPage = !activeCategory;

  // ============================================================================
  // Fetch categories once (with cache)
  // ============================================================================
  
  useEffect(() => {
    const now = Date.now();
    
    if (cache.categories && now - cache.timestamp < CACHE_TTL) {
      setCategories(cache.categories);
      if (cache.allBrands) setAllBrands(cache.allBrands);
      setChildCategories(cache.childCategories);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [catRes, brandsRes] = await Promise.all([
          fetch("/api/filters/categories"),
          fetch("/api/filters/brands"),
        ]);

        // Safe JSON parsing helper
        const safeJson = async (res: Response) => {
          try {
            const text = await res.text();
            if (!text || text.trim() === '') return null;
            return JSON.parse(text);
          } catch {
            return null;
          }
        };

        if (catRes.ok) {
          const data = await safeJson(catRes);
          const cats = Array.isArray(data?.categories) ? data.categories : [];
          cache.categories = cats;
          setCategories(cats);
        }

        if (brandsRes.ok) {
          const data = await safeJson(brandsRes);
          const brands = Array.isArray(data?.brands) ? data.brands : [];
          cache.allBrands = brands;
          setAllBrands(brands);
        }

        cache.timestamp = now;
      } catch (error) {
        console.error("Error fetching filters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ============================================================================
  // Fetch category-specific brands (debounced, no duplicates)
  // ============================================================================
  
  useEffect(() => {
    if (isShopPage) {
      setCategoryBrands([]);
      return;
    }

    // Prevent duplicate requests
    if (fetchingBrandsRef.current === activeCategory) return;
    fetchingBrandsRef.current = activeCategory;

    const fetchBrands = async () => {
      setBrandsLoading(true);
      try {
        const res = await fetch(`/api/filters/brands?category=${encodeURIComponent(activeCategory!)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim()) {
            try {
              const data = JSON.parse(text);
              setCategoryBrands(Array.isArray(data?.brands) ? data.brands : []);
            } catch {
              setCategoryBrands([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setBrandsLoading(false);
        fetchingBrandsRef.current = null;
      }
    };

    fetchBrands();
  }, [activeCategory, isShopPage]);

  // ============================================================================
  // Auto-expand parent when subcategory selected
  // ============================================================================
  
  useEffect(() => {
    if (!activeCategory || categories.length === 0) return;

    // Check if it's a top-level category
    const isTopLevel = categories.some(cat => cat.slug === activeCategory);
    if (isTopLevel) return;

    // Check if we already know the parent from cache
    const parentSlug = cache.parentMap[activeCategory];
    if (parentSlug) {
      setExpandedCategories(prev => new Set(prev).add(parentSlug));
      return;
    }

    // Check loaded children to find parent
    for (const [slug, children] of Object.entries(childCategories)) {
      if (children.some(child => child.slug === activeCategory)) {
        cache.parentMap[activeCategory] = slug;
        setExpandedCategories(prev => new Set(prev).add(slug));
        return;
      }
    }

    // Need to fetch children to find parent - do this for all categories in parallel
    const findParent = async () => {
      const unfetchedParents = categories.filter(cat => !childCategories[cat.slug]);
      
      if (unfetchedParents.length === 0) return;

      // Fetch all unfetched children in parallel (max 5 at a time)
      const batch = unfetchedParents.slice(0, 5);
      
      await Promise.all(batch.map(async (parent) => {
        if (fetchingChildrenRef.current.has(parent.slug)) return;
        fetchingChildrenRef.current.add(parent.slug);

        try {
          const res = await fetch(`/api/filters/categories?category=${encodeURIComponent(parent.slug)}`);
          if (res.ok) {
            const text = await res.text();
            if (text && text.trim()) {
              try {
                const data = JSON.parse(text);
                const children = Array.isArray(data?.categories) ? data.categories : [];
                
                // Update cache and state
                cache.childCategories[parent.slug] = children;
                children.forEach((child: Category) => {
                  cache.parentMap[child.slug] = parent.slug;
                });

                setChildCategories(prev => ({ ...prev, [parent.slug]: children }));

                // Check if this is our parent
                if (children.some((child: Category) => child.slug === activeCategory)) {
                  setExpandedCategories(prev => new Set(prev).add(parent.slug));
                }
              } catch {
                // Invalid JSON, skip
              }
            }
          }
        } catch (error) {
          console.error("Error fetching children:", error);
        } finally {
          fetchingChildrenRef.current.delete(parent.slug);
        }
      }));
    };

    findParent();
  }, [activeCategory, categories, childCategories]);

  // ============================================================================
  // Handlers
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    params.delete("page");
    const search = params.toString();
    router.replace(`${pathname}${search ? `?${search}` : ""}`, { scroll: false });
  }, [pathname, searchParams, router]);

  const handleCategoryClick = useCallback((slug: string) => {
    if (activeCategory === slug) {
      router.push("/shop", { scroll: false });
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("categories");
      params.delete("brands");
      params.delete("page");
      const search = params.toString();
      router.push(`/product-category/${slug}${search ? `?${search}` : ""}`, { scroll: false });
    }
  }, [activeCategory, searchParams, router]);

  const handleBrandToggle = useCallback((brandSlug: string) => {
    const newBrands = activeBrands.includes(brandSlug)
      ? activeBrands.filter(b => b !== brandSlug)
      : [...activeBrands, brandSlug];
    updateURL({ brands: newBrands.length > 0 ? newBrands.join(",") : null });
  }, [activeBrands, updateURL]);

  const handleClearAll = useCallback(() => {
    router.replace(pathname || "/shop", { scroll: false });
  }, [pathname, router]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      newSet.has(section) ? newSet.delete(section) : newSet.add(section);
      return newSet;
    });
  }, []);

  const toggleCategoryExpand = useCallback(async (slug: string) => {
    // Toggle expansion
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.has(slug) ? newSet.delete(slug) : newSet.add(slug);
      return newSet;
    });

    // Fetch children if not cached
    if (!childCategories[slug] && !fetchingChildrenRef.current.has(slug)) {
      fetchingChildrenRef.current.add(slug);
      setLoadingChildren(prev => new Set(prev).add(slug));

      try {
        const res = await fetch(`/api/filters/categories?category=${encodeURIComponent(slug)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.trim()) {
            try {
              const data = JSON.parse(text);
              const children = Array.isArray(data?.categories) ? data.categories : [];
              
              cache.childCategories[slug] = children;
              children.forEach((child: Category) => {
                cache.parentMap[child.slug] = slug;
              });

              setChildCategories(prev => ({ ...prev, [slug]: children }));
            } catch {
              // Invalid JSON, skip
            }
          }
        }
      } catch (error) {
        console.error("Error fetching subcategories:", error);
      } finally {
        setLoadingChildren(prev => {
          const newSet = new Set(prev);
          newSet.delete(slug);
          return newSet;
        });
        fetchingChildrenRef.current.delete(slug);
      }
    }
  }, [childCategories]);

  // ============================================================================
  // Derived state
  // ============================================================================
  
  const displayBrands = isShopPage ? allBrands : categoryBrands;
  const hasActiveFilters = activeBrands.length > 0 || !!activeCategory;
  const activeFilterCount = activeBrands.length + (activeCategory ? 1 : 0);

  // Get active filter labels for pills
  const activeFilterPills = useMemo(() => {
    const pills: Array<{ label: string; type: 'category' | 'brand'; value: string }> = [];
    
    if (activeCategory) {
      pills.push({
        label: activeCategory.replace(/-/g, ' '),
        type: 'category',
        value: activeCategory,
      });
    }
    
    activeBrands.forEach(brandSlug => {
      const brand = displayBrands.find(b => b.slug === brandSlug) || allBrands.find(b => b.slug === brandSlug);
      pills.push({
        label: brand?.name || brandSlug.replace(/-/g, ' '),
        type: 'brand',
        value: brandSlug,
      });
    });
    
    return pills;
  }, [activeCategory, activeBrands, displayBrands, allBrands]);

  // ============================================================================
  // Render
  // ============================================================================
  
  if (loading) {
    return (
      <aside 
        className={`${isMobileDrawer ? 'w-full' : 'w-full lg:w-64'} space-y-4`}
        aria-label="Loading filters"
        aria-busy="true"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="h-40 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded" />
        </div>
      </aside>
    );
  }

  return (
    <aside 
      ref={sidebarRef}
      className={`${isMobileDrawer ? 'w-full' : 'w-full lg:w-64'} space-y-1`}
      aria-label="Product filters"
      role="region"
    >
      {/* Mobile drawer header */}
      {isMobileDrawer && (
        <div className="flex items-center justify-between pb-4 mb-2 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Close filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Active Filter Pills */}
      {activeFilterPills.length > 0 && (
        <div className="pb-3 mb-2 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Active filters ({activeFilterCount})
            </p>
            <button
              onClick={handleClearAll}
              className="text-xs text-teal-600 hover:text-teal-800 font-medium focus:outline-none focus:underline"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="list" aria-label="Active filters">
            {activeFilterPills.map((pill, index) => (
              <button
                key={`${pill.type}-${pill.value}`}
                onClick={() => {
                  if (pill.type === 'category') {
                    router.push('/shop', { scroll: false });
                  } else {
                    handleBrandToggle(pill.value);
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-teal-50 text-teal-700 rounded-full hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 transition-colors"
                aria-label={`Remove ${pill.label} filter`}
              >
                <span className="capitalize max-w-[120px] truncate">{pill.label}</span>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header (desktop only) */}
      {!isMobileDrawer && (
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Filters</h2>
          {hasActiveFilters && activeFilterPills.length === 0 && (
            <button onClick={handleClearAll} className="text-xs text-teal-600 hover:underline focus:outline-none focus:underline">
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Categories */}
      <FilterSection
        title="Department"
        isExpanded={expandedSections.has("category")}
        onToggle={() => toggleSection("category")}
      >
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No categories</p>
        ) : (
          <ul className="space-y-0.5 max-h-80 overflow-y-auto">
            {categories.map((cat) => {
              const isSelected = activeCategory === cat.slug;
              const isExpanded = expandedCategories.has(cat.slug);
              const isLoadingCh = loadingChildren.has(cat.slug);
              const children = childCategories[cat.slug] || [];
              const hasSelectedChild = children.some(c => c.slug === activeCategory);
              
              return (
                <li key={cat.id}>
                  <div className="flex items-center">
                    <button
                      onClick={() => handleCategoryClick(cat.slug)}
                      className={`flex-1 text-left py-1 text-sm transition-colors ${
                        isSelected || hasSelectedChild
                          ? "text-orange-700 font-semibold"
                          : "text-gray-700 hover:text-orange-600"
                      }`}
                    >
                      {isSelected && "› "}
                      {cat.name}
                      {cat.count !== undefined && cat.count > 0 && (
                        <span className="ml-1 text-gray-400 text-xs">({cat.count})</span>
                      )}
                    </button>
                    <button
                      onClick={() => toggleCategoryExpand(cat.slug)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isLoadingCh ? (
                        <LoadingSpinner />
                      ) : (
                        <ChevronIcon isOpen={isExpanded} />
                      )}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
                      {isLoadingCh ? (
                        <li className="py-1 text-xs text-gray-400">Loading...</li>
                      ) : children.length > 0 ? (
                        children.map((child) => (
                          <li key={child.id}>
                            <button
                              onClick={() => handleCategoryClick(child.slug)}
                              className={`text-left py-0.5 text-sm transition-colors ${
                                activeCategory === child.slug
                                  ? "text-orange-700 font-semibold"
                                  : "text-gray-600 hover:text-orange-600"
                              }`}
                            >
                              {activeCategory === child.slug && "› "}
                              {child.name}
                              {child.count !== undefined && child.count > 0 && (
                                <span className="ml-1 text-gray-400 text-xs">({child.count})</span>
                              )}
                            </button>
                          </li>
                        ))
                      ) : (
                        <li className="py-1 text-xs text-gray-400">No subcategories</li>
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </FilterSection>

      {/* Brands */}
      <FilterSection
        title="Brand"
        isExpanded={expandedSections.has("brand")}
        onToggle={() => toggleSection("brand")}
      >
        {brandsLoading ? (
          <div className="py-2 space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-5 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : displayBrands.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">
            {isShopPage ? "No brands available" : "No brands in this category"}
          </p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {displayBrands.map((brand) => (
              <li key={brand.id}>
                <label className="flex items-center gap-2 py-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeBrands.includes(brand.slug)}
                    onChange={() => handleBrandToggle(brand.slug)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className={`text-sm ${activeBrands.includes(brand.slug) ? "text-orange-700 font-medium" : "text-gray-700"}`}>
                    {brand.name}
                    {brand.count !== undefined && brand.count > 0 && (
                      <span className="ml-1 text-gray-400 text-xs">({brand.count})</span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </FilterSection>
    </aside>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function FilterSection({ title, isExpanded, onToggle, children, id }: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  id?: string;
}) {
  const sectionId = id || title.toLowerCase().replace(/\s+/g, '-');
  const contentId = `${sectionId}-content`;
  
  return (
    <div className="border-b border-gray-200 py-3">
      <button 
        onClick={onToggle} 
        className="flex w-full items-center justify-between py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded"
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="text-sm font-bold text-gray-900">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div 
        id={contentId}
        role="region"
        aria-labelledby={sectionId}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${isExpanded ? "max-h-[500px] mt-2 opacity-100" : "max-h-0 opacity-0"}`}
      >
        {children}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
