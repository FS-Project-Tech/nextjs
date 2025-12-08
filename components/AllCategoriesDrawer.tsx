"use client";

import { useEffect, useState, useCallback, memo } from "react";
import Link from "next/link";

interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count?: number;
}

interface CategoryListProps {
  categories: WCCategory[];
  expanded: Record<number, boolean>;
  childrenMap: Record<number, WCCategory[]>;
  onToggleExpand: (catId: number) => void;
}

// Extracted as a separate memoized component to avoid recreation during render
const CategoryList = memo(function CategoryList({ 
  categories, 
  expanded, 
  childrenMap, 
  onToggleExpand 
}: CategoryListProps) {
  return (
    <ul className="space-y-1">
      {categories.map((cat) => (
        <li key={cat.id}>
          <div className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50">
            <Link href={`/product-category/${cat.slug}`} className="flex-1 text-sm text-gray-800 hover:text-gray-900">
              {cat.name}
            </Link>
            <button
              type="button"
              onClick={() => onToggleExpand(cat.id)}
              className="rounded p-1 text-gray-500 hover:bg-gray-100"
              aria-label="Toggle subcategories"
            >
              <svg
                viewBox="0 0 24 24"
                className={`h-5 w-5 transition-transform ${expanded[cat.id] ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>
          {expanded[cat.id] && (
            <ul className="ml-3 border-l border-gray-200 pl-3 mb-2">
              {childrenMap[cat.id]?.length ? (
                childrenMap[cat.id].map((child) => (
                  <li key={child.id} className="py-1">
                    <Link href={`/product-category/${child.slug}`} className="text-sm text-gray-700 hover:text-gray-900">
                      {child.name}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="py-1 text-xs text-gray-500">No subcategories</li>
              )}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
});

export default function AllCategoriesDrawer({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<WCCategory[]>([]);
  const [childrenMap, setChildrenMap] = useState<Record<number, WCCategory[]>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!open || categories.length > 0) return;
    
    let cancelled = false;
    
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/categories?per_page=100&parent=0&hide_empty=true");
        const data = await res.json();
        if (!cancelled) {
          setCategories(Array.isArray(data) ? data : data.categories || []);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchCategories();
    
    return () => {
      cancelled = true;
    };
  }, [open, categories.length]);

  const toggleExpand = useCallback(async (catId: number) => {
    setExpanded((prev) => ({ ...prev, [catId]: !prev[catId] }));
    
    // Check if already loaded
    setChildrenMap((current) => {
      if (current[catId]) return current;
      
      // Fetch children asynchronously
      fetch(`/api/categories?per_page=100&parent=${catId}&hide_empty=true`)
        .then((res) => res.json())
        .then((data) => {
          setChildrenMap((m) => ({ 
            ...m, 
            [catId]: Array.isArray(data) ? data : data.categories || [] 
          }));
        })
        .catch(() => {
          setChildrenMap((m) => ({ ...m, [catId]: [] }));
        });
      
      return current;
    });
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        All Categories
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          
          {/* Mobile bottom sheet */}
          <div className="md:hidden absolute left-0 right-0 bottom-0 h-[70vh] max-h-[85vh] rounded-t-2xl bg-white shadow-xl">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-300 my-2" />
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Browse Categories</h3>
              <button onClick={() => setOpen(false)} className="rounded p-2 text-gray-600 hover:bg-gray-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-[calc(100%-56px)] overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : categories.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No categories found.</div>
              ) : (
                <CategoryList 
                  categories={categories}
                  expanded={expanded}
                  childrenMap={childrenMap}
                  onToggleExpand={toggleExpand}
                />
              )}
            </div>
          </div>

          {/* Desktop left drawer */}
          <div className="hidden md:block absolute left-0 top-0 h-full w-[320px] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Browse Categories</h3>
              <button onClick={() => setOpen(false)} className="rounded p-2 text-gray-600 hover:bg-gray-100">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-[calc(100%-48px)] overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="p-4 text-sm text-gray-600">Loading...</div>
              ) : categories.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">No categories found.</div>
              ) : (
                <CategoryList 
                  categories={categories}
                  expanded={expanded}
                  childrenMap={childrenMap}
                  onToggleExpand={toggleExpand}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}