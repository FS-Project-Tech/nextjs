"use client";

import { useRefinementList, useRange } from "react-instantsearch";
import { RefinementList } from "react-instantsearch";

<RefinementList attribute="taxonomies.product_brand" />


export default function Filters() {
  const { items, refine } = useRefinementList({
    attribute: "taxonomies.product_cat",
  });

  const { range, refine: refinePrice } = useRange({
    attribute: "price",
  });

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      {/* <div>
        <h3 className="font-bold mb-2">Categories</h3>
        {items.map((item) => (
          <label key={item.value} className="block">
            <input
              type="checkbox"
              checked={item.isRefined}
              onChange={() => refine(item.value)}
            />
            {item.label}
          </label>
        ))}
      </div> */}
      <RefinementList attribute="taxonomies.product_cat" />

      {/* Price Filter */}
      <div>
        <h3 className="font-bold mb-2">Price</h3>
        <button
          onClick={() => refinePrice([0, 1000])}
          className="block text-sm"
        >
          ₹0 - ₹1000
        </button>
        <button
          onClick={() => refinePrice([1000, 5000])}
          className="block text-sm"
        >
          ₹1000 - ₹5000
        </button>
      </div>
    </div>
  );
}