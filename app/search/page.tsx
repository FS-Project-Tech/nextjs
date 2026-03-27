"use client";

import { algoliasearch } from "algoliasearch";
import { InstantSearch } from "react-instantsearch";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import FiltersSidebar from "@/components/search/Filters";
import ProductHits from "@/components/search/ProductHits";

export default function SearchPage() {
  const params = useSearchParams();
  const query = params.get("q") || "";

  const searchClient = useMemo(() => {
    return algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
    );
  }, []);

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="wp_searchable_posts"
      initialUiState={{
        wp_searchable_posts: {
          query,
        },
      }}
    >
      <FiltersSidebar />
      <ProductHits />
    </InstantSearch>
  );
}