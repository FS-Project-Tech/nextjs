"use client";

import { liteClient as algoliasearch } from "algoliasearch/lite";
import { InstantSearch } from "react-instantsearch";
import { useSearchParams } from "next/navigation";
import FiltersSidebar from "@/components/search/Filters";
import ProductHits from "@/components/search/ProductHits";

export default function SearchPage() {
  const params = useSearchParams();
  const query = params.get("q") || "";

  const searchClient = algoliasearch(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
    process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
  );

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