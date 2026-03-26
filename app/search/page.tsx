"use client";

import { InstantSearch } from "react-instantsearch";
import { algoliaClient } from "@/lib/algolia";
import { useSearchParams } from "next/navigation";
import FiltersSidebar from "@/components/search/Filters";
import ProductHits from "@/components/search/ProductHits";

export default function SearchPage() {
  const params = useSearchParams();
  const query = params.get("q") || "";

  return (
    <InstantSearch
      searchClient={algoliaClient}
      indexName="wp_searchable_posts"
      initialUiState={{
        products: {
          query,
        },
      }}
    >
      {/* Filters + Results */}
      <FiltersSidebar />
      <ProductHits />
    </InstantSearch>
  );
}