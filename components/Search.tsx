"use client";

import {
  InstantSearch,
  SearchBox,
  Hits,
} from "react-instantsearch";
import { searchClient } from "@/lib/algolia";

function Hit({ hit }: any) {
  return (
    <div className="p-3 border rounded">
      <img src={hit.image} width={60} />
      <h3>{hit.name}</h3>
      <p>₹{hit.price}</p>
    </div>
  );
}

export default function Search() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="products"
    >
      <SearchBox />

      <Hits hitComponent={Hit} />
    </InstantSearch>
  );
}