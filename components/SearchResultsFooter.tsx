"use client";

import { useRouter } from "next/navigation";
import React from "react";

interface SearchResultsFooterProps {
  query: string;
}

export default function SearchResultsFooter({ query }: SearchResultsFooterProps) {
  const router = useRouter();

  const handleViewAll = () => {
    if (!query.trim()) return;
    router.push(`/search?query=${encodeURIComponent(query)}`);
  };

  return (
    <div className="border-t border-gray-200 px-4 py-2 text-center">
      <button
        onClick={handleViewAll}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        View all results for "{query}"
      </button>
    </div>
  );
}
