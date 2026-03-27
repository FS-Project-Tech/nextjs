"use client";

import { useState, useMemo } from "react";
import { InstantSearch } from "react-instantsearch";
import { algoliasearch } from "algoliasearch";
import CustomSearchBox from "./CustomSearchBox";
import ProductHits from "@/components/search/ProductHits";

export default function SearchWithDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const searchClient = useMemo(() => {
    return algoliasearch(
      process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
      process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
    );
  }, []);

  return (
    <InstantSearch searchClient={searchClient} indexName="wp_searchable_posts">
      <div className="relative w-full max-w-xl">
        
        {/* Input */}
        <div
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        >
          <CustomSearchBox />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute left-0 top-full w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[400px] overflow-y-auto z-50">
            <ProductHits />
          </div>
        )}
      </div>
    </InstantSearch>
  );
}