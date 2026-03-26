"use client";

import dynamic from "next/dynamic";

// ✅ Now allowed (client component)
const FilterSidebar = dynamic(() => import("@/components/FilterSidebar"), {
  ssr: false,
});

export default function ProductPageClient() {
  return (
    <div className="flex gap-6">
      <FilterSidebar />
      {/* Your ProductGrid here */}
    </div>
  );
}