"use client";

import { useState } from "react";
import { searchClient } from "@/lib/algolia";
import Image from "next/image";
import Link from "next/link";

function safeImage(src?: string) {
  if (!src || src.trim() === "") {
    return "/placeholder-product.png";
  }
  return src;
}

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  let timer: NodeJS.Timeout;

    function handleSearch(value: string) {
      setQuery(value);

      clearTimeout(timer);

      timer = setTimeout(async () => {
        if (!value) {
          setResults([]);
          return;
        }

        const { results }: any = await searchClient.search([
          {
            indexName: "woocommerce_products",
            query: value,
            hitsPerPage: 6,
          },
        ]);

        setResults(results[0].hits);
      }, 300);
    }

  return (
    <div className="relative w-full max-w-xl">

      {/* search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full border rounded-lg px-4 py-2"
      />

      {/* dropdown */}
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

{/* Product Name */}
<span className="text-sm font-medium text-gray-800 line-clamp-2">
  {item.name}
</span>

{/* Category */}
{item.category?.[0] && (
  <span className="text-xs text-gray-500">
    {item.category[0]}
  </span>
)}

{/* Price Section */}
<div className="flex items-center gap-2">

  {/* Sale Price */}
  {item.on_sale ? (
    <>
      <span className="text-sm font-semibold text-green-600">
        ₹{item.sale_price}
      </span>

      <span className="text-xs line-through text-gray-400">
        ₹{item.regular_price}
      </span>

      <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">
        SALE
      </span>
    </>
  ) : (
    <span className="text-sm font-semibold text-green-600">
      ₹{item.price}
    </span>
  )}

</div>

{/* GST Label */}
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