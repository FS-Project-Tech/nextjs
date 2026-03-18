"use client";

import { InstantSearch } from "react-instantsearch";
import { searchClient } from "@/lib/algolia";
import ProductHits from "@/components/search/ProductHits";
import FilterSidebar from "@/components/FilterSidebar";

export default function ArchivePage() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="wp_posts_product"
    >
      <div className="grid grid-cols-4 gap-6">
        
        {/* ✅ Filters */}
        <FilterSidebar />

        {/* ✅ Products */}
        <div className="col-span-3">
          <ProductHits />
        </div>

      </div>
    </InstantSearch>
  );
}