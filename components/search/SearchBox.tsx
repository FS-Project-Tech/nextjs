"use client";

import { useSearchBox } from "react-instantsearch";

export default function SearchBox() {
  const { query, refine } = useSearchBox();

  return (
    <input
      value={query}
      onChange={(e) => refine(e.target.value)}
      placeholder="Search products..."
      className="w-full p-3 border rounded-lg mb-4"
    />
  );
}