"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { searchIndex, SearchIndexItem } from '@/lib/searchIndex';
import { addSearchTerm, getRecentSearchTerms } from '@/lib/history';

// Types for Web Speech API (not fully typed in TypeScript)
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

// Types for API responses
interface APIProduct {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  price?: string;
  regular_price?: string;
  on_sale?: boolean;
  image?: string;
}

interface APICategory {
  id: number;
  name: string;
  slug: string;
  image?: string;
  logo?: string;
  thumbnail?: string;
}

interface APIBrand {
  id: number | string;
  name: string;
  slug: string;
  image?: string;
  logo?: string;
}

interface APITag {
  id: number | string;
  name: string;
  slug: string;
}

interface APISku {
  id: number;
  name: string;
  slug: string;
}

/**
 * Highlight matched keywords in text
 */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const qLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let index = textLower.indexOf(qLower);
  
  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }
    // Add highlighted match
    parts.push(
      <mark key={index} className="bg-yellow-200 font-semibold text-gray-900 px-0.5 rounded">
        {text.slice(index, index + query.length)}
      </mark>
    );
    lastIndex = index + query.length;
    index = textLower.indexOf(qLower, lastIndex);
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? <>{parts}</> : text;
}

export default function SearchBar({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState<string>(''); // Explicitly type as string to ensure it's never undefined
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    products: SearchIndexItem[];
    categories: SearchIndexItem[];
    brands: SearchIndexItem[];
    tags: SearchIndexItem[];
    skus: SearchIndexItem[];
  }>({ products: [], categories: [], brands: [], tags: [], skus: [] });
  const [productCount, setProductCount] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isIndexReady, setIsIndexReady] = useState(false);
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

  // Use consistent placeholder text to avoid hydration mismatch
  // Only update after mount to prevent hydration issues
  const [placeholderText, setPlaceholderText] = useState('Search products, brands, categories...');

  // Mark mounted and initialize search index
  useEffect(() => {
    setMounted(true);
    
    // Load recent searches from localStorage
    if (typeof window !== 'undefined') {
      setRecentSearches(getRecentSearchTerms());
    }
    
    // Initialize Web Speech API for voice search
    if (typeof window !== 'undefined') {
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
        
        recognitionRef.current.onerror = () => {
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
    
    searchIndex.initialize().then(() => {
      setIsIndexReady(searchIndex.isReady());
      const count = searchIndex.getTotalCount();
      setProductCount(count);
      // Update placeholder only after mount and count is available
      if (count !== null && count > 0) {
        setPlaceholderText(`Search from ${count.toLocaleString()} products...`);
      }
    }).catch(() => {
      // Silently handle initialization errors - search will fallback to API
      setIsIndexReady(false);
    });
    
    // Fetch product count from API as fallback
    fetch('/api/search/count')
      .then(res => res.json())
      .then(data => {
        if (data.count && data.count > 0) {
          setProductCount(data.count);
          setPlaceholderText(`Search from ${data.count.toLocaleString()} products...`);
        }
      })
      .catch(() => {});
  }, []);

  // Debounced search (guarded by mounted)
  useEffect(() => {
    if (!mounted) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim() || query.trim().length < 2) {
      setResults({ products: [], categories: [], brands: [], tags: [], skus: [] });
      // Keep dropdown open if focused to show recent searches
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        let searchResults: {
          products: SearchIndexItem[];
          categories: SearchIndexItem[];
          brands: SearchIndexItem[];
          tags: SearchIndexItem[];
          skus: SearchIndexItem[];
        };

        // Detect multiple SKU search
        const parseMultipleSKUs = (q: string): string[] => {
          const skus = q
            .split(/[,\n\r]+|\s{2,}/)
            .map(s => s.trim())
            .filter(s => s.length >= 2 && /^[A-Z0-9_-]+$/i.test(s));
          return skus.length > 1 ? skus : [];
        };
        
        const multipleSKUs = parseMultipleSKUs(query);
        const isMultipleSKUSearch = multipleSKUs.length > 1;
        const searchLimit = isMultipleSKUSearch ? 50 : 30; // Allow more results for multiple SKU search

        // Try client-side search first (fastest)
        if (isIndexReady && searchIndex.isReady()) {
          const allResults = searchIndex.search(query, searchLimit);
          searchResults = {
            products: allResults.filter(r => r.type === 'product').slice(0, isMultipleSKUSearch ? 50 : 10),
            categories: allResults.filter(r => r.type === 'category').slice(0, 8),
            brands: allResults.filter(r => r.type === 'brand').slice(0, 8),
            tags: allResults.filter(r => r.type === 'tag').slice(0, 8),
            skus: allResults.filter(r => r.type === 'sku').slice(0, 8),
          };
        } else {
          // Fallback to API search
          const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
            cache: 'no-store',
          });
          const data = await res.json();
          
          // Transform API results to SearchIndexItem format
          searchResults = {
            products: ((data.products || []) as APIProduct[]).map((p) => ({
              key: `product_${p.id}`,
              id: p.id,
              type: 'product' as const,
              name: p.name,
              slug: p.slug,
              sku: p.sku,
              price: p.price,
              regularPrice: p.regular_price,
              onSale: p.on_sale,
              image: p.image,
              searchableText: '',
              tokens: [],
            })),
            categories: ((data.categories || []) as APICategory[]).slice(0, 5).map((c) => ({
              key: `category_${c.id}`,
              id: c.id,
              type: 'category' as const,
              name: c.name,
              slug: c.slug,
              image: c.image || c.logo || c.thumbnail, // Support ACF image/logo
              searchableText: '',
              tokens: [],
            })),
            brands: ((data.brands || []) as APIBrand[]).slice(0, 5).map((b) => {
              const id = typeof b.id === 'string' ? parseInt(b.id, 10) || 0 : b.id;
              return {
                key: `brand_${id}`,
                id,
                type: 'brand' as const,
                name: b.name,
                slug: b.slug,
                image: b.image || b.logo, // Support ACF logo
                searchableText: '',
                tokens: [],
              };
            }),
            tags: ((data.tags || []) as APITag[]).map((t) => {
              const id = typeof t.id === 'string' ? parseInt(t.id, 10) || 0 : t.id;
              return {
                key: `tag_${id}`,
                id,
                type: 'tag' as const,
                name: t.name,
                slug: t.slug,
                searchableText: '',
                tokens: [],
              };
            }),
            skus: ((data.skus || []) as APISku[]).map((s) => ({
              key: `sku_${s.id}`,
              id: s.id,
              type: 'sku' as const,
              name: s.name,
              slug: s.slug,
              searchableText: '',
              tokens: [],
            })),
          };
        }

        // Ensure searchResults has all required fields
        setResults({
          products: searchResults.products || [],
          categories: searchResults.categories || [],
          brands: searchResults.brands || [],
          tags: searchResults.tags || [],
          skus: searchResults.skus || [],
        });
      } catch (error) {
        console.error('Search error:', error);
        setResults({ products: [], categories: [], brands: [], tags: [], skus: [] });
      } finally {
        setIsLoading(false);
      }
    }, 150); // 150ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, isIndexReady, mounted]);

  // Close dropdown on outside click (guarded by mounted)
  useEffect(() => {
    if (!mounted) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mounted]);

  // Build flat list for keyboard navigation
  const flatList = useMemo(() => {
    const items: Array<{
      type: 'heading' | 'item';
      label: string;
      route?: string;
      item?: SearchIndexItem;
      index: number;
    }> = [];
    let itemIndex = 0;

    const addGroup = (title: string, arr: SearchIndexItem[], routeFn: (item: SearchIndexItem) => string) => {
      if (arr.length === 0) return;
      items.push({ type: 'heading', label: title, index: -1 });
      for (const item of arr) {
        items.push({
          type: 'item',
          label: item.name,
          route: routeFn(item),
          item,
          index: itemIndex++,
        });
      }
    };

    // Add Matching SKUs group first if it exists
    if (results.skus && results.skus.length > 0) {
      addGroup('Matching SKUs', results.skus, (item) => `/products/${item.slug}`);
    }
    addGroup('Products', results.products, (item) => `/products/${item.slug}`);
    addGroup('Categories', results.categories, (item) => `/product-category/${item.slug}`);
    addGroup('Brands', results.brands, (item) => `/shop?brand=${encodeURIComponent(item.slug)}`);
    addGroup('Tags', results.tags, (item) => `/shop?tag=${encodeURIComponent(item.slug)}`);

    return items;
  }, [results]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const itemsOnly = flatList.filter(x => x.type === 'item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < itemsOnly.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = itemsOnly[highlightedIndex];
      if (selected && selected.route) {
        router.push(selected.route);
        setIsOpen(false);
        setQuery('');
      } else if (query.trim()) {
        // Navigate to search results page
        addSearchTerm(query);
        router.push(`/search?query=${encodeURIComponent(query)}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, [isOpen, flatList, highlightedIndex, query, router]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      addSearchTerm(query);
      router.push(`/search?query=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
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
    if (!recognitionRef.current) {
      alert('Voice search is not supported in your browser');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleImageSearch = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
      setIsImageSearch(true);
      
      // TODO: Implement image search API call
      // For now, we'll extract text from image using OCR or image recognition
      // This would typically call an API endpoint that processes the image
      
      // You can implement image search by:
      // 1. Sending image to your backend API
      // 2. Using image recognition service (Google Vision, AWS Rekognition, etc.)
      // 3. Extracting text using OCR
      
      // Example: Call image search API
      // fetch('/api/search/image', {
      //   method: 'POST',
      //   body: formData
      // }).then(res => res.json()).then(data => {
      //   // Handle search results
      // });
    };
    reader.readAsDataURL(file);
  };

  const clearImageSearch = () => {
    setImagePreview(null);
    setIsImageSearch(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderProduct = (item: SearchIndexItem) => {
    const price = parseFloat(item.price || '0');
    const regularPrice = parseFloat(item.regularPrice || '0');
    const onSale = item.onSale && regularPrice > price && regularPrice > 0;
    const discount = onSale ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;

    return (
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-[10px] text-gray-400">No Img</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-900">
            {highlightMatches(item.name, query)}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
            {item.sku && (
              <span className={`rounded px-1.5 py-0.5 ${
                item.sku.toLowerCase().includes(query.toLowerCase())
                  ? 'bg-blue-100 font-semibold text-blue-700'
                  : 'bg-gray-100'
              }`}>
                SKU: {highlightMatches(item.sku, query)}
              </span>
            )}
            {onSale ? (
              <>
                <span className="font-semibold text-gray-900">${price.toFixed(2)}</span>
                <span className="line-through text-red-500">${regularPrice.toFixed(2)}</span>
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                  -{discount}%
                </span>
              </>
            ) : (
              price > 0 && (
                <span className="font-semibold text-gray-900">${price.toFixed(2)}</span>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  const hasResults = results.products.length > 0 || results.categories.length > 0 || results.brands.length > 0 || results.tags.length > 0;

  // Don't render search functionality until mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className={`relative ${className}`} suppressHydrationWarning>
        <form className="relative">
          <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 shadow-sm" suppressHydrationWarning>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value="" // Always controlled, even in SSR
              placeholder="Search products, brands, categories..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              disabled={true}
              readOnly={true}
            />
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef} suppressHydrationWarning>
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2.5 shadow-sm transition-shadow focus-within:border-blue-500 focus-within:shadow-md" suppressHydrationWarning>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query || ''} // Ensure value is always a string, never undefined
            onChange={(e) => {
              setQuery(e.target.value || ''); // Ensure we always set a string
              setHighlightedIndex(-1);
            }}
            onFocus={() => {
              setIsOpen(true);
              // Refresh recent searches when focused
              if (typeof window !== 'undefined') {
                setRecentSearches(getRecentSearchTerms());
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            aria-label="Search products"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          />
          {/* Image Search Button */}
          <button
            type="button"
            onClick={handleImageSearch}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Search by image"
            title="Search by image"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            aria-label="Upload image for search"
          />
          
          {/* Voice Search Button */}
          {recognitionRef.current && (
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`shrink-0 transition-colors ${
                isListening 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              aria-label="Voice search"
              title="Voice search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          )}
          
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="shrink-0 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          >
            <ul
              ref={listRef}
              className="max-h-96 overflow-auto"
              role="listbox"
            >
              {/* Image Preview */}
              {imagePreview && (
                <li className="border-b border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-gray-100">
                      <img src={imagePreview} alt="Search preview" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Image search</p>
                      <p className="text-xs text-gray-500">Processing image...</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearImageSearch}
                      className="shrink-0 text-gray-400 hover:text-gray-600"
                      aria-label="Remove image"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </li>
              )}
              
              {/* Voice Search Indicator */}
              {isListening && (
                <li className="border-b border-gray-100 bg-blue-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-sm font-medium">Listening...</span>
                  </div>
                </li>
              )}

              {/* Recent Searches - Show when no query or query is too short */}
              {!isLoading && !query.trim() && recentSearches.length > 0 && (
                <>
                  <li className="border-b border-gray-100 bg-gray-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Recent Searches
                  </li>
                  {recentSearches.slice(0, 5).map((term, idx) => (
                    <li
                      key={`recent-${idx}`}
                      className="cursor-pointer px-4 py-2.5 transition-colors hover:bg-gray-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleRecentSearchClick(term);
                      }}
                      role="option"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-700">{term}</span>
                      </div>
                    </li>
                  ))}
                </>
              )}

              {isLoading && (
                <li className="px-4 py-8 text-center text-sm text-gray-500">
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
                  <span className="ml-2">Searching...</span>
                </li>
              )}

              {!isLoading && !hasResults && query.trim().length >= 2 && (
                <li className="px-4 py-8 text-center text-sm text-gray-500">
                  <p className="font-medium">No results found</p>
                  <p className="mt-1 text-xs">Try a different search term</p>
                </li>
              )}

              {/* Multiple SKU Search Indicator */}
              {!isLoading && hasResults && (() => {
                const multipleSKUs = query
                  .split(/[,\n\r]+|\s{2,}/)
                  .map(s => s.trim())
                  .filter(s => s.length >= 2 && /^[A-Z0-9_-]+$/i.test(s));
                return multipleSKUs.length > 1;
              })() && (
                <li className="border-b border-gray-100 bg-blue-50/50 px-4 py-2 text-xs text-blue-700">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Searching multiple SKUs: {(() => {
                      const skus = query
                        .split(/[,\n\r]+|\s{2,}/)
                        .map(s => s.trim())
                        .filter(s => s.length >= 2 && /^[A-Z0-9_-]+$/i.test(s));
                      return skus.slice(0, 3).join(', ') + (skus.length > 3 ? ` +${skus.length - 3} more` : '');
                    })()}</span>
                  </div>
                </li>
              )}

              {!isLoading && hasResults && (
                <>
                  {flatList.map((row, i) => {
                    if (row.type === 'heading') {
                      return (
                        <li
                          key={`heading-${i}`}
                          className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 first:border-t-0"
                        >
                          {row.label}
                        </li>
                      );
                    }

                    const isHighlighted = row.index === highlightedIndex;
                    
                    return (
                      <li
                        key={`item-${i}`}
                        data-index={row.index}
                        className={`cursor-pointer px-4 py-3 transition-colors ${
                          isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onMouseEnter={() => setHighlightedIndex(row.index)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          if (row.route) handleItemClick(row.route);
                        }}
                        role="option"
                        aria-selected={isHighlighted}
                      >
                        {row.item?.type === 'product' ? (
                          renderProduct(row.item)
                        ) : row.item?.type === 'brand' || row.item?.type === 'category' ? (
                          <div className="flex items-center gap-3">
                            {row.item.image && (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={row.item.image} 
                                  alt={row.item.name} 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    // Hide image on error
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-gray-900">
                                {highlightMatches(row.label, query)}
                              </span>
                              {row.item.type === 'brand' && (
                                <p className="text-xs text-gray-500 mt-0.5">Brand</p>
                              )}
                              {row.item.type === 'category' && (
                                <p className="text-xs text-gray-500 mt-0.5">Category</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">•</span>
                            <span className="font-medium text-gray-900">
                              {highlightMatches(row.label, query)}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}

                  <li className="border-t border-gray-100 px-4 py-3 text-right">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        if (query.trim()) {
                          addSearchTerm(query);
                          router.push(`/search?query=${encodeURIComponent(query)}`);
                          setIsOpen(false);
                        }
                      }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View all results for &quot;{query}&quot;
                    </button>
                  </li>
                </>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
