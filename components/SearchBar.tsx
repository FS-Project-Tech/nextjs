"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { searchIndex, SearchIndexItem } from "@/lib/searchIndex";
import { addSearchTerm, getRecentSearchTerms } from "@/lib/history";

/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const q = query.toLowerCase();
  const t = text.toLowerCase();
  const out: React.ReactNode[] = [];
  let last = 0;
  let idx = t.indexOf(q);

  while (idx !== -1) {
    if (idx > last) out.push(text.slice(last, idx));
    out.push(
      <mark key={idx} className="bg-yellow-200 font-semibold px-0.5 rounded">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    last = idx + query.length;
    idx = t.indexOf(q, last);
  }

  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/* --------------------------------------------------
   COMPONENT
-------------------------------------------------- */

export default function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState({
    products: [] as SearchIndexItem[],
    categories: [] as SearchIndexItem[],
    brands: [] as SearchIndexItem[],
    tags: [] as SearchIndexItem[],
    skus: [] as SearchIndexItem[],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /* --------------------------------------------------
     MOUNT
  -------------------------------------------------- */

  useEffect(() => {
    setMounted(true);
    setRecentSearches(getRecentSearchTerms());
    searchIndex.initialize().catch(() => {});
  }, []);

  /* --------------------------------------------------
     CLOSE ON ROUTE CHANGE
  -------------------------------------------------- */

  useEffect(() => {
    setIsOpen(false);
  }, [router]);

  /* --------------------------------------------------
     CLICK OUTSIDE
  -------------------------------------------------- */

  useEffect(() => {
    if (!mounted) return;

    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mounted]);

  /* --------------------------------------------------
     SEARCH EFFECT (DEBOUNCED + ABORTABLE)
  -------------------------------------------------- */

  useEffect(() => {
    if (!mounted) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults({ products: [], categories: [], brands: [], tags: [], skus: [] });
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const abortController = new AbortController();

    debounceRef.current = setTimeout(async () => {
      try {
        let data;

        if (searchIndex.isReady()) {
          const all = searchIndex.search(query, 50);
          data = {
            products: all.filter(x => x.type === "product"),
            categories: all.filter(x => x.type === "category"),
            brands: all.filter(x => x.type === "brand"),
            tags: all.filter(x => x.type === "tag"),
            skus: all.filter(x => x.type === "sku"),
          };
        } else {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            signal: abortController.signal,
            cache: "no-store",
          });
          data = await res.json();
        }

        setResults({
          products: data.products || [],
          categories: data.categories || [],
          brands: data.brands || [],
          tags: data.tags || [],
          skus: data.skus || [],
        });
      } catch (e: any) {
        if (e.name !== "AbortError") console.error("Search error", e);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      abortController.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mounted]);

  /* --------------------------------------------------
     FLAT LIST (KEYBOARD NAV)
  -------------------------------------------------- */

  const flatList = useMemo(() => {
    const items: { label: string; route: string; item: SearchIndexItem }[] = [];

    results.skus.forEach(i => items.push({ item: i, label: i.name, route: `/products/${i.slug}` }));
    results.products.forEach(i => items.push({ item: i, label: i.name, route: `/products/${i.slug}` }));
    results.categories.forEach(i => items.push({ item: i, label: i.name, route: `/product-category/${i.slug}` }));
    results.brands.forEach(i => items.push({ item: i, label: i.name, route: `/shop?brand=${i.slug}` }));
    results.tags.forEach(i => items.push({ item: i, label: i.name, route: `/shop?tag=${i.slug}` }));

    return items;
  }, [results]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);

  /* --------------------------------------------------
     KEYBOARD
  -------------------------------------------------- */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, flatList.length - 1));
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const selected = flatList[highlightedIndex];
        if (selected) {
          router.push(selected.route);
        } else {
          addSearchTerm(query);
          router.push(`/search?query=${encodeURIComponent(query)}`);
        }
        setIsOpen(false);
      }

      if (e.key === "Escape") setIsOpen(false);
    },
    [flatList, highlightedIndex, isOpen, query, router]
  );

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */

  if (!mounted) return null;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search products, brands, categories…"
        className="w-full rounded-full border px-4 py-2"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            ref={listRef}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 mt-2 w-full rounded-xl border bg-white shadow-xl max-h-96 overflow-auto"
          >
            {isLoading && <li className="p-4 text-sm">Searching…</li>}

            {!isLoading &&
              flatList.map((row, i) => (
                <li
                  key={row.item.key}
                  className={`px-4 py-2 cursor-pointer ${
                    i === highlightedIndex ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onMouseDown={() => router.push(row.route)}
                >
                  {highlightMatches(row.label, query)}
                </li>
              ))}

            {!isLoading && flatList.length === 0 && (
              <li className="p-6 text-center text-sm text-gray-500">
                No results found
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
