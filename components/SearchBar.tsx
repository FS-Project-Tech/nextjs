"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { searchIndex, SearchIndexItem } from "@/lib/searchIndex";
import { addSearchTerm, getRecentSearchTerms } from "@/lib/history";


// Types for Web Speech API
interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: { [index: number]: SpeechRecognitionResult };
}

interface SpeechRecognitionEvent {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

// Highlight function
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const qLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = textLower.indexOf(qLower);

  while (index !== -1) {
    if (index > lastIndex) parts.push(text.slice(lastIndex, index));
    parts.push(
      <mark key={index} className="bg-yellow-200 font-semibold text-gray-900 px-0.5 rounded">
        {text.slice(index, index + query.length)}
      </mark>
    );
    lastIndex = index + query.length;
    index = textLower.indexOf(qLower, lastIndex);
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? <>{parts}</> : text;
}

// Footer component for “View all results”
function SearchResultsFooter({ query }: { query: string }) {
  const router = useRouter();
  const handleViewAll = () => {
    if (!query.trim()) return;
    addSearchTerm(query);
    router.push(`/search?query=${encodeURIComponent(query)}`);
  };

  return (
    <div className="border-t border-gray-200 px-4 py-2 text-center">
      <button
        onClick={handleViewAll}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        View all results for "{query}"
      </button>
    </div>
  );
}

export default function SearchBar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    products: SearchIndexItem[];
    categories: SearchIndexItem[];
    brands: SearchIndexItem[];
    tags: SearchIndexItem[];
    skus: SearchIndexItem[];
  }>({ products: [], categories: [], brands: [], tags: [], skus: [] });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isIndexReady, setIsIndexReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isImageSearch, setIsImageSearch] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [placeholderText, setPlaceholderText] = useState("Search products, brands, categories...");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") setRecentSearches(getRecentSearchTerms());

    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognitionCtor = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    searchIndex.initialize().then(() => {
      setIsIndexReady(searchIndex.isReady());
      const count = searchIndex.getTotalCount();
      if (count) setPlaceholderText(`Search from ${count.toLocaleString()} products...`);
    }).catch(() => setIsIndexReady(false));

  }, []);

  // Debounced search
  useEffect(() => {
    if (!mounted) return;
    const abortController = new AbortController();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setResults({ products: [], categories: [], brands: [], tags: [], skus: [] });
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        let searchResults: typeof results;

        if (isIndexReady && searchIndex.isReady()) {
          const allResults = searchIndex.search(query, 30);
          searchResults = {
            products: allResults.filter(r => r.type === "product").slice(0, 10),
            categories: allResults.filter(r => r.type === "category").slice(0, 8),
            brands: allResults.filter(r => r.type === "brand").slice(0, 8),
            tags: allResults.filter(r => r.type === "tag").slice(0, 8),
            skus: allResults.filter(r => r.type === "sku").slice(0, 8),
          };
        } else {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            cache: "no-store",
            signal: abortController.signal,
          });
          const data = await res.json();
          searchResults = {
            products: (data.products || []).map((p: any) => ({ ...p, key: `product_${p.id}`, type: "product" })),
            categories: (data.categories || []).map((c: any) => ({ ...c, key: `category_${c.id}`, type: "category" })),
            brands: (data.brands || []).map((b: any) => ({ ...b, key: `brand_${b.id}`, type: "brand" })),
            tags: (data.tags || []).map((t: any) => ({ ...t, key: `tag_${t.id}`, type: "tag" })),
            skus: (data.skus || []).map((s: any) => ({ ...s, key: `sku_${s.id}`, type: "sku" })),
          };
        }

        setResults(searchResults);
      } catch (error: any) {
        if (error?.name !== "AbortError") console.error("Search error:", error);
        setResults({ products: [], categories: [], brands: [], tags: [], skus: [] });
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      debounceTimerRef.current && clearTimeout(debounceTimerRef.current);
      abortController.abort();
    };
  }, [query, isIndexReady, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mounted]);

  const flatList = useMemo(() => {
    const items: Array<{ type: "heading" | "item"; label: string; route?: string; item?: SearchIndexItem; index: number }> = [];
    let itemIndex = 0;
    const addGroup = (title: string, arr: SearchIndexItem[], routeFn: (i: SearchIndexItem) => string) => {
      if (!arr.length) return;
      items.push({ type: "heading", label: title, index: -1 });
      arr.forEach(i => items.push({ type: "item", label: i.name, route: routeFn(i), item: i, index: itemIndex++ }));
    };
    if (results.skus.length) addGroup("Matching SKUs", results.skus, (i) => `/products/${i.slug}`);
    addGroup("Products", results.products, (i) => `/products/${i.slug}`);
    addGroup("Categories", results.categories, (i) => `/product-category/${i.slug}`);
    addGroup("Brands", results.brands, (i) => `/shop?brand=${encodeURIComponent(i.slug)}`);
    addGroup("Tags", results.tags, (i) => `/shop?tag=${encodeURIComponent(i.slug)}`);
    return items;
  }, [results]);

  useEffect(() => setHighlightedIndex(-1), [results]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const itemsOnly = flatList.filter(x => x.type === "item");
    if (e.key === "ArrowDown") e.preventDefault(), setHighlightedIndex(prev => Math.min(prev + 1, itemsOnly.length - 1));
    else if (e.key === "ArrowUp") e.preventDefault(), setHighlightedIndex(prev => Math.max(prev - 1, 0));
    else if (e.key === "Enter") {
      e.preventDefault();
      const selected = highlightedIndex >= 0 ? itemsOnly[highlightedIndex] : null;
      if (selected?.route) { router.push(selected.route); setIsOpen(false); setQuery(""); }
      else if (query.trim()) { addSearchTerm(query); router.push(`/search?query=${encodeURIComponent(query)}`); setIsOpen(false); }
    } else if (e.key === "Escape") setIsOpen(false);
  }, [isOpen, flatList, highlightedIndex, query, router]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (item) item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) { addSearchTerm(query); router.push(`/search?query=${encodeURIComponent(query)}`); setIsOpen(false); }
  };

  const handleItemClick = (route: string) => {
    if (query.trim()) addSearchTerm(query);
    router.push(route);
    setIsOpen(false);
    setQuery("");
  };

  const handleRecentSearchClick = (term: string) => { setQuery(term); addSearchTerm(term); router.push(`/search?query=${encodeURIComponent(term)}`); setIsOpen(false); };

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) { alert("Voice search not supported"); return; }
    if (isListening) recognitionRef.current.stop(), setIsListening(false);
    else recognitionRef.current.start(), setIsListening(true);
  };

  const handleImageSearch = () => fileInputRef.current?.click();
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImagePreview(ev.target?.result as string); setIsImageSearch(true); };
    reader.readAsDataURL(file);
  };
  const clearImageSearch = () => { setImagePreview(null); setIsImageSearch(false); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const renderProduct = (item: SearchIndexItem) => (
    <div className="flex items-center gap-3">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
        {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[10px] text-gray-400">No Img</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{highlightMatches(item.name, query)}</div>
      </div>
    </div>
  );

  const hasResults = results.products.length || results.categories.length || results.brands.length || results.tags.length || results.skus.length;

  if (!mounted) return (
    <div className={`relative ${className}`} suppressHydrationWarning>
      <input type="text" placeholder="Search..." disabled className="w-full rounded-full border border-gray-300 px-4 py-2 text-sm bg-white" />
    </div>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:shadow-md">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightedIndex(-1); }}
            onFocus={() => { setIsOpen(true); setRecentSearches(getRecentSearchTerms()); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="w-full bg-transparent text-sm outline-none"
          />
          <button type="button" onClick={handleImageSearch} className="text-gray-400 hover:text-gray-600">
            📷
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          {recognitionRef.current && <button type="button" onClick={handleVoiceSearch}>{isListening ? "🎙️" : "🎤"}</button>}
          {query && <button type="button" onClick={() => setQuery("")}>❌</button>}
        </div>
      </form>

      <AnimatePresence>
  {isOpen && (
    <motion.ul
      ref={listRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
    >
      {query.trim() === "" && recentSearches.length > 0 && (
        <>
          <li className="px-4 py-2 text-xs font-semibold text-gray-500">Recent Searches</li>
          {recentSearches.map((term, idx) => (
            <li key={idx} className="cursor-pointer px-4 py-2 hover:bg-gray-100" onClick={() => handleRecentSearchClick(term)}>
              {term}
            </li>
          ))}
          <hr className="my-1 border-gray-200" />
        </>
      )}

      {/* Loading skeleton */}
      {isLoading && query.trim() !== "" && (
        <>
          {Array.from({ length: 5 }).map((_, idx) => (
            <li key={idx} className="flex items-center gap-3 px-4 py-2">
              <div className="h-12 w-12 rounded bg-gray-200 animate-pulse"></div>
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse"></div>
                <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse"></div>
              </div>
            </li>
          ))}
        </>
      )}

      {/* Actual search results */}
      {!isLoading && flatList.map((item, idx) =>
        item.type === "heading" ? (
          <li key={idx} className="px-4 py-2 text-xs font-semibold text-gray-500">{item.label}</li>
        ) : (
          <li
            key={item.index}
            data-index={item.index}
            className={`cursor-pointer px-4 py-2 ${highlightedIndex === item.index ? "bg-blue-50" : "hover:bg-gray-50"}`}
            onMouseEnter={() => setHighlightedIndex(item.index)}
            onClick={() => item.route && handleItemClick(item.route)}
          >
            {item.item?.type === "product" ? renderProduct(item.item) : highlightMatches(item.label, query)}
          </li>
        )
      )}

      {hasResults && !isLoading && <SearchResultsFooter query={query} />}
    </motion.ul>
  )}
      </AnimatePresence>

    </div>
  );
}
