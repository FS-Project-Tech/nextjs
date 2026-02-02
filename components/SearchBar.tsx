"use client";

import { algoliasearch } from "algoliasearch";
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

interface SearchBarProps {
  className?: string;
}

export default function ProductSearch({ className }: SearchBarProps) {
  return (
    <div className={className}>
    <InstantSearch
      searchClient={searchClient}
      indexName="wp_searchable_posts"
    >
      <SearchBox placeholder="Search products..." />

      <RefinementList attribute="categories" />

      <Hits
        classNames={{
          list: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
          item: "h-full"
        }}
      />


      <Pagination />
    </InstantSearch>
    </div>
  );
}
