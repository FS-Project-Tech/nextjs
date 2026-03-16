"use client";

import { useRef, useState } from "react";
import { searchClient } from "@/lib/algolia";
import Image from "next/image";
import Link from "next/link";

type AlgoliaHit = {
  objectID: string;
  slug: string;
  name?: string;
  image?: string;
  category?: string[];
  on_sale?: boolean;
  sale_price?: string | number;
  regular_price?: string | number;
  price?: string | number;
  tax_status?: string;
  prices_include_tax?: boolean;
};

type SearchResponseWithHits<T> = {
  hits: T[];
};

function hasHits<T>(result: unknown): result is SearchResponseWithHits<T> {
  return (
    typeof result === "object" &&
    result !== null &&
    "hits" in result &&
    Array.isArray((result as SearchResponseWithHits<T>).hits)
  );
}

function safeImage(src?: string) {
  if (!src || src.trim() === "") {
    return "/placeholder-product.png";
  }
  return src;
}

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlgoliaHit[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleSearch(value: string) {
    setQuery(value);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      if (!value.trim()) {
        setResults([]);
        return;
      }

      try {
        const response = await searchClient.search<AlgoliaHit>([
          {
            indexName:
              process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ||
              "woocommerce_products",
            params: {
              query: value,
              hitsPerPage: 6,
            },
          },
        ]);

        const firstResult = response.results?.[0];
        const hits = hasHits<AlgoliaHit>(firstResult) ? firstResult.hits : [];
        setResults(hits);
      } catch (error) {
        console.error("Algolia search error:", error);
        setResults([]);
      }
    }, 300);
  }

  return (
    <div className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full border rounded-lg px-4 py-2"
      />

      {query && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg z-50">
          {results.map((item) => (
            <Link
              key={item.objectID}
              href={`/products/${item.slug}`}
              className="flex items-center gap-3 p-3 hover:bg-gray-100"
            >
              <Image
                loader={({ src }) => src}
                src={safeImage(item.image)}
                alt={item.name || "Product"}
                width={40}
                height={40}
                className="rounded border object-contain bg-white"
              />

              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-800 line-clamp-2">
                  {item.name}
                </span>

                {item.category?.[0] && (
                  <span className="text-xs text-gray-500">
                    {item.category[0]}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {item.on_sale ? (
                    <>
                      <span className="text-sm font-semibold text-green-600">
                        ${item.sale_price}
                      </span>

                      <span className="text-xs line-through text-gray-400">
                        ${item.regular_price}
                      </span>

                      <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">
                        SALE
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-green-600">
                      ${item.price}
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-gray-500">
                  {item.tax_status === "none"
                    ? "GST Free"
                    : item.prices_include_tax
                    ? "Incl. GST"
                    : "Excl. GST"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}