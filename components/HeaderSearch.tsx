"use client";

import { useState } from "react";
import { liteClient as algoliasearch } from "algoliasearch/lite";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "",
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY || ""
);

type AlgoliaHit = {
  objectID: string;
  name?: string;
  title?: string;
  slug?: string;
};

export default function HeaderSearch() {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<AlgoliaHit[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (nextValue: string) => {
    setValue(nextValue);

    if (!nextValue.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);

      const { results } = await searchClient.search<AlgoliaHit>([
        {
          indexName: "woocommerce_products",
          params: {
            query: nextValue,
            hitsPerPage: 6,
          },
        },
      ]);

      const firstResult = results?.[0];
      const hits = firstResult && "hits" in firstResult ? (firstResult.hits as AlgoliaHit[]) : [];
      setResults(hits);
    } catch (error) {
      console.error("Algolia search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search products..."
      />

      {loading && <p>Loading...</p>}

      {!loading && results.length > 0 && (
        <ul>
          {results.map((item) => (
            <li key={item.objectID}>
              {item.name || item.title || item.objectID}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}