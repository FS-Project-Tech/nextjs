"use client";

import { InstantSearch } from "react-instantsearch";
import { algoliasearch } from "algoliasearch";
import SearchBox from "@/components/search/SearchBox";
import ProductHits from "@/components/search/ProductHits";

export default function SearchBar() {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

  // 🚨 PREVENT BUILD CRASH
  if (!appId || !apiKey) return null;

  const searchClient = algoliasearch(appId, apiKey);

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="wp_searchable_posts"
    >
      <div className="relative w-full max-w-xl">
        <SearchBox />
        <div className="absolute left-0 top-full w-full mt-1 bg-white border rounded-lg shadow-lg max-h-[400px] overflow-y-auto z-50">
          <ProductHits />
        </div>
      </div>
    </InstantSearch>
  );
}