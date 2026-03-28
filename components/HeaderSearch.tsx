"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Typesense from "typesense";

const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
      port: 443, 
      protocol: "https"
    }
  ],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY
});

export default function HeaderSearch() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);

const [categories, setCategories] = useState([]); // ✅ ADD THIS
const [brands, setBrands] = useState([]); // ✅ ADD THIS
  // 🔥 Debounce search
  useEffect(() => {
    if (!query) {
      setResults([]);
      setCategories([]);
      setBrands([]);
      return;
    }
  
    const delay = setTimeout(async () => {
      try {
        const formattedQuery = query
            .split(/[,\/&\s]+/) // 🔥 same fix here
            .map(q => q.trim())
            .filter(Boolean)
            .join(" || ");

            const isSkuSearch = /^[0-9,\s&\/]+$/.test(query);

          const res = await client.collections(process.env.NEXT_PUBLIC_TYPESENSE_INDEX_NAME).documents().search({
            q: formattedQuery,
            query_by: isSkuSearch ? "sku" : "name,sku,category,brand",
            num_typos: 1,
            per_page: 20,
            facet_by: isSkuSearch ? "category" : "category,brand"
          });
  
        setShow(true);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  
    return () => clearTimeout(delay);
  }, [query]);

  // 🔍 Submit (Enter)
  const handleSubmit = (e) => {
    e.preventDefault();
  
    if (query) {
      const cleanedQuery = query
        .split(/[,\/&\s]+/) // 🔥 added &
        .map(q => q.trim())
        .filter(Boolean)
        .join(",");
  
      router.push(`/search?q=${encodeURIComponent(cleanedQuery)}`);
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      
      {/* Search Input */}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShow(true)}
          onBlur={() => setTimeout(() => setShow(false), 200)}
          className="w-full border p-2 rounded"
        />
      </form>

      {show && (
        <div className="absolute w-full bg-white shadow-lg mt-1 z-50 max-h-96 overflow-auto rounded">

          {/* 🔥 Categories */}
          {categories.length > 0 && (
            <div className="border-b p-2">
              {categories.slice(0, 5).map((cat) => (
                <div
                  key={cat.value}
                  onMouseDown={() =>
                    router.push(`/search?q=${query}&category=${cat.value}`)
                  }
                  className="text-blue-600 text-sm py-1 cursor-pointer hover:underline"
                >
                  {cat.value} ({cat.count})
                </div>
              ))}
            </div>
          )}

          {/* 🔥 Brands */}
          {brands.length > 0 && (
            <div className="border-b p-2">
              {brands.slice(0, 5).map((brand) => (
                <div
                  key={brand.value}
                  onMouseDown={() =>
                    router.push(`/search?q=${query}&brand=${brand.value}`)
                  }
                  className="text-green-600 text-sm py-1 cursor-pointer hover:underline"
                >
                  {brand.value} ({brand.count})
                </div>
              ))}
            </div>
          )}

          {/* 🔥 Products */}
          {results.map((item) => {
            const hit = item.document;

            return (
              <div
                key={hit.id}
                onMouseDown={() => router.push(`/product/${hit.slug}`)}
                className="flex gap-3 p-2 hover:bg-gray-100 cursor-pointer"
              >
                <img src={hit.image} className="w-10 h-10 object-contain" />

                <div>
                  <p className="text-sm font-medium">{hit.name}</p>

                  {/* 🔥 Category + Brand */}
                  <p className="text-xs text-gray-500">
                    {Array.isArray(hit.category) ? hit.category[0] : hit.category}
                    {hit.brand ? ` • ${hit.brand}` : ""}
                  </p>

                  <p className="text-xs text-gray-400">{hit.sku}</p>
                </div>
              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}