"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HeaderSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?search=${encodeURIComponent(q)}`);
  };

  return (
    <div className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitSearch();
        }}
        placeholder="Search products..."
        className="w-full rounded-lg border px-4 py-2"
      />
    </div>
  );
}