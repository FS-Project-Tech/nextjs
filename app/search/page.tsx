"use client";

import { InstantSearch } from "react-instantsearch";
import { searchClient } from "@/lib/algolia";
import SearchBox from "@/components/search/SearchBox";
import ProductHits from "@/components/search/ProductHits";
import Filters from "@/components/search/Filters";  

export default function SearchPage() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={process.env.NEXT_PUBLIC_ALGOLIA_INDEX!}
    >
      <div className="grid grid-cols-4 gap-6 p-6">
        <Filters />
        
        <div className="col-span-3">
          <SearchBox />
          <ProductHits />
        </div>
      </div>
    </InstantSearch>
  );
}