"use client";

import { useState } from "react";
import type { WooCommerceProduct, WooCommerceVariation } from "@/lib/woocommerce";
import { sanitizeHTML } from "@/lib/xss-sanitizer";

interface ProductInfoAccordionProps {
  product: WooCommerceProduct;
  variations: WooCommerceVariation[];
}

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export default function ProductInfoAccordion({
  product,
  variations,
}: ProductInfoAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(["description"]));

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const accordionItems: AccordionItem[] = [
    {
      id: "description",
      title: "Description",
      content: (
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{
            __html: sanitizeHTML(product.description || product.short_description || "No description available."),
          }}
        />
      ),
    },
    {
      id: "specifications",
      title: "Specifications",
      content: (
        <div className="space-y-3">
          {product.sku && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium text-gray-700">SKU</span>
              <span className="text-gray-900">{product.sku}</span>
            </div>
          )}
          {product.weight && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium text-gray-700">Weight</span>
              <span className="text-gray-900">{product.weight}</span>
            </div>
          )}
          {product.dimensions && (
            <>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium text-gray-700">Dimensions</span>
                <span className="text-gray-900">
                  {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height}
                </span>
              </div>
            </>
          )}
          {product.stock_status && (
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium text-gray-700">Stock Status</span>
              <span className="text-gray-900 capitalize">{product.stock_status}</span>
            </div>
          )}
          {variations.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 font-medium text-gray-700">Available Variations:</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                {variations.slice(0, 5).map((variation) => (
                  <li key={variation.id}>
                    {variation.attributes
                      .map((attr) => `${attr.name}: ${attr.option}`)
                      .join(", ")}
                    {variation.sku && ` (SKU: ${variation.sku})`}
                  </li>
                ))}
                {variations.length > 5 && (
                  <li className="text-gray-500">...and {variations.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "shipping",
      title: "Shipping & Returns",
      content: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            {product.shipping_required !== false
              ? "This item requires shipping."
              : "This is a digital/virtual product."}
          </p>
          {product.shipping_class && (
            <p>
              <span className="font-medium">Shipping Class:</span> {product.shipping_class}
            </p>
          )}
          <p className="mt-4">
            <span className="font-medium">Returns:</span> Please contact us for return information.
          </p>
        </div>
      ),
    },
    {
      id: "additional",
      title: "Additional Information",
      content: (
        <div className="space-y-3">
          {product.categories && product.categories.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">Categories: </span>
              <span className="text-gray-900">
                {product.categories.map((cat) => cat.name).join(", ")}
              </span>
            </div>
          )}
          {product.tags && product.tags.length > 0 && (
            <div>
              <span className="font-medium text-gray-700">Tags: </span>
              <span className="text-gray-900">
                {product.tags.map((tag) => tag.name).join(", ")}
              </span>
            </div>
          )}
          {product.average_rating && (
            <div>
              <span className="font-medium text-gray-700">Average Rating: </span>
              <span className="text-gray-900">
                {product.average_rating} / 5 ({product.rating_count || 0} reviews)
              </span>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-2" suppressHydrationWarning>
      {accordionItems.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden rounded-lg border border-gray-200 bg-white"
        >
          <button
            onClick={() => toggleItem(item.id)}
            className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            <span>{item.title}</span>
            <svg
              className={`h-5 w-5 transition-transform ${
                openItems.has(item.id) ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {openItems.has(item.id) && (
            <div className="border-t border-gray-200 px-4 py-4">{item.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}

