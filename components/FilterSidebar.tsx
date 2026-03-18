"use client";

import { RefinementList } from "react-instantsearch";

export default function FilterSidebar() {
  return (
    <div className="space-y-6">
      
      {/* Brand Filter */}
      <div>
        <h3 className="font-bold mb-2">Brand</h3>
        <RefinementList attribute="product_brand" />
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="font-bold mb-2">Category</h3>
        <RefinementList attribute="product_cat" />
      </div>

      {/* Attribute Filter */}
      <div>
        <h3 className="font-bold mb-2">Packaging</h3>
        <RefinementList attribute="pa_each-box" />
      </div>

    </div>
  );
}