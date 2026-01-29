"use client";

import { algoliasearch } from "algoliasearch";
// import AlgoliaHitWrapper from "@/components/AlgoliaHitWrapper";
import {
  InstantSearch,
  SearchBox,
  Hits,
  RefinementList,
  Pagination
} from "react-instantsearch";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
);

export default function ProductSearch() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="wp_searchable_posts"
    >
      <SearchBox placeholder="Search products..." />

      <RefinementList attribute="categories" />

      <Hits
        // hitComponent={AlgoliaHitWrapper}
        classNames={{
          list: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
          item: "h-full"
        }}
      />


      <Pagination />
    </InstantSearch>
  );
}
