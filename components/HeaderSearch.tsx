"use client";

import { useMemo, useState } from "react";
import { liteClient as algoliasearch } from "algoliasearch/lite";

type AlgoliaHit = {
  objectID: string;
  name?: string;
  title?: string;
  slug?: string;
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

export default function HeaderSearch() {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<AlgoliaHit[]>([]);
  const [loading, setLoading] = useState(false);

  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_SEARCH_API_KEY;

  const searchClient = useMemo(() => {
    if (!appId || !apiKey) return null;
    return algoliasearch(appId, apiKey);
  }, [appId, apiKey]);

  const handleSearch = async (nextValue: string) => {
    setValue(nextValue);

    if (!nextValue.trim()) {
      setResults([]);
      return;
    }

    if (!searchClient) {
      console.warn("Algolia env vars are missing.");
      setResults([]);
      return;
    }

    try {
      setLoading(true);

      const response = await searchClient.search<AlgoliaHit>([
        {
          indexName: "woocommerce_products",
          params: {
            query: nextValue,
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