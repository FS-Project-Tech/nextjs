"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { searchIndex, SearchIndexItem } from '@/lib/searchIndex';
import { addSearchTerm, getRecentSearchTerms } from '@/lib/history';
import SearchResultsFooter from "@/components/SearchResultsFooter";

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

// Helper: highlight matched text
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
  return <>{parts}</>;
}

export default function SearchBar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
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
  const [mounted, setMounted] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isImageSearch, setIsImageSearch] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [placeholderText, setPlaceholderText] = useState('Search products, brands, categories...');

  // Initialize search index & speech recognition
  useEffect(() => {
    setMounted(true);
    setRecentSearches(getRecentSearchTerms());

    const windowWithSpeech = window as WindowWithSpeechRecognition;
    const SpeechRecognitionCtor = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    searchIndex.initialize().then(() => {
      const count = searchIndex.getTotalCount();
      if (count) setPlaceholderText(`Search from ${count.toLocaleString()} products...`);
    });
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
        if (searchIndex.isReady()) {
          const allResults = searchIndex.search(query, 30);
          searchResults = {
            products: allResults.filter(r => r.type === 'product').slice(0, 10),
            categories: allResults.filter(r => r.type === 'category').slice(0, 8),
            brands: allResults.filter(r => r.type === 'brand').slice(0, 8),
            tags: allResults.filter(r => r.type === 'tag').slice(0, 8),
            skus: allResults.filter(r => r.type === 'sku').slice(0, 8),
          };
        } else {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            cache: 'no-store',
            signal: abortController.signal,
          });
          const data = await res.json();
          searchResults = {
            products: (data.products || []).map((p: any) => ({ ...p, type: 'product', key: `product_${p.id}` })),
            categories: (data.categories || []).map((c: any) => ({ ...c, type: 'category', key: `category_${c.id}` })),
            brands: (data.brands || []).map((b: any) => ({ ...b, type: 'brand', key: `brand_${b.id}` })),
            tags: (data.tags || []).map((t: any) => ({ ...t, type: 'tag', key: `tag_${t.id}` })),
            skus: (data.skus || []).map((s: any) => ({ ...s, type: 'sku', key: `sku_${s.id}` })),
          };
        }
        setResults(searchResults);
      } catch (error: any) {
        if (error?.name !== 'AbortError') console.error('Search error:', error);
        setResults({ products: [], categories: [], brands: [], tags: [], skus: [] });
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      abortController.abort();
    };
  }, [query, mounted]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flatten results for rendering + keyboard nav
  const flatList = useMemo(() => {
    const items: Array<{ type: 'heading' | 'item'; label: string; route?: string; item?: SearchIndexItem; index: number }> = [];
    let itemIndex = 0;

    const addGroup = (title: string, arr: SearchIndexItem[], routeFn: (i: SearchIndexItem) => string) => {
      if (!arr.length) return;
      items.push({ type: 'heading', label: title, index: -1 });
      for (const item of arr) items.push({ type: 'item', label: item.name, route: routeFn(item), item, index: itemIndex++ });
    };

    if (results.skus.length) addGroup('Matching SKUs', results.skus, i => `/products/${i.slug}`);
    addGroup('Products', results.products, i => `/products/${i.slug}`);
    addGroup('Categories', results.categories, i => `/product-category/${i.slug}`);
    addGroup('Brands', results.brands, i => `/shop?brand=${encodeURIComponent(i.slug)}`);
    addGroup('Tags', results.tags, i => `/shop?tag=${encodeURIComponent(i.slug)}`);

    return items;
  }, [results]);

  useEffect(() => setHighlightedIndex(-1), [results]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    const itemsOnly = flatList.filter(x => x.type === 'item');
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(prev => Math.min(prev + 1, itemsOnly.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(prev => Math.max(prev - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = highlightedIndex >= 0 ? itemsOnly[highlightedIndex] : null;
      if (selected?.route) { router.push(selected.route); setIsOpen(false); setQuery(''); }
      else if (query.trim()) { addSearchTerm(query); router.push(`/search?query=${encodeURIComponent(query)}`); setIsOpen(false); }
    } else if (e.key === 'Escape') setIsOpen(false);
  }, [flatList, highlightedIndex, isOpen, query, router]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    addSearchTerm(query);
    router.push(`/search?query=${encodeURIComponent(query)}`);
    setIsOpen(false);
  };

  const handleItemClick = (route: string) => {
    if (query.trim()) addSearchTerm(query);
    router.push(route);
    setIsOpen(false);
    setQuery('');
  };

  const handleRecentSearchClick = (term: string) => {
    setQuery(term);
    addSearchTerm(term);
    router.push(`/search?query=${encodeURIComponent(term)}`);
    setIsOpen(false);
  };

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) return alert('Voice search not supported');
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { setIsListening(true); recognitionRef.current.start(); }
  };

  const handleImageSearch = () => fileInputRef.current?.click();
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setIsImageSearch(true);
  };
  const clearImageSearch = () => { setImagePreview(null); setIsImageSearch(false); fileInputRef.current!.value = ''; setResults({ products: [], categories: [], brands: [], tags: [], skus: [] }); };

  // Render function for product items
  const renderProduct = (item: SearchIndexItem) => {
    const price = parseFloat(item.price || '0');
    const regularPrice = parseFloat(item.regularPrice || '0');
    const onSale = item.onSale && regularPrice > price && regularPrice > 0;
    const discount = onSale ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;
    return (
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
          {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[10px] text-gray-400">No Img</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">{highlightMatches(item.name, query)}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
            {item.sku && <span className={`rounded px-1.5 py-0.5 ${item.sku.toLowerCase().includes(query.toLowerCase()) ? 'bg-blue-100 font-semibold text-blue-700' : 'bg-gray-100'}`}>SKU: {highlightMatches(item.sku, query)}</span>}
            {onSale ? <>
              <span className="font-semibold text-gray-900">${price.toFixed(2)}</span>
              <span className="line-through text-red-500">${regularPrice.toFixed(2)}</span>
              <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">-{discount}%</span>
            </> : price > 0 && <span className="font-semibold text-gray-900">${price.toFixed(2)}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 shadow-sm focus-within:border-blue-500 focus-within:shadow-md">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { setIsOpen(true); setRecentSearches(getRecentSearchTerms()); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <button type="button" onClick={handleImageSearch} className="shrink-0 text-gray-400 hover:text-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          {recognitionRef.current && (
            <button type="button" onClick={handleVoiceSearch} className={`shrink-0 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
          )}
          {query && <button type="button" onClick={() => setQuery('')} className="shrink-0 text-gray-400 hover:text-gray-600"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
        </div>
      </form>

      <AnimatePresence>
        {isOpen && (results.products.length || results.categories.length || results.brands.length || results.tags.length || results.skus.length || recentSearches.length) && (
          <motion.ul
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 mt-2 max-h-96 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {recentSearches.length > 0 && query.trim() === '' && (
              <>
                <li className="px-4 py-2 text-xs font-semibold text-gray-500">Recent Searches</li>
                {recentSearches.map((term, idx) => (
                  <li key={idx} className="cursor-pointer px-4 py-2 hover:bg-gray-100" onClick={() => handleRecentSearchClick(term)}>{term}</li>
                ))}
                <hr className="my-1 border-gray-200" />
              </>
            )}
            {flatList.map((item, idx) => item.type === 'heading' ? (
              <li key={idx} className="px-4 py-2 text-xs font-semibold text-gray-500">{item.label}</li>
            ) : (
              <li
                key={item.index}
                data-index={item.index}
                className={`cursor-pointer px-4 py-2 ${highlightedIndex === item.index ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                onMouseEnter={() => setHighlightedIndex(item.index)}
                onClick={() => item.route && handleItemClick(item.route)}
              >
                {item.item?.type === 'product' ? renderProduct(item.item) : highlightMatches(item.label, query)}
              </li>
            ))}
            {flatList.length > 0 && <SearchResultsFooter query={query} />}
          </motion.ul>
        )}
      </AnimatePresence>

      {isImageSearch && imagePreview && (
        <div className="absolute left-0 top-full mt-2 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-2 shadow-md">
          <img src={imagePreview} className="h-16 w-16 rounded object-cover" alt="Uploaded" />
          <button onClick={clearImageSearch} className="text-sm text-red-500 hover:text-red-700">Clear Image</button>
        </div>
      )}
    </div>
  );
}
