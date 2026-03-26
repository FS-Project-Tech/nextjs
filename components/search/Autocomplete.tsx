"use client";

import { useEffect, useRef } from "react";
import { autocomplete } from "@algolia/autocomplete-js";
import { getAlgoliaResults } from "@algolia/autocomplete-core";
import algoliasearch from "algoliasearch";
import { useRouter } from "next/navigation";

type ProductHit = {
  objectID: string;
  name: string;
  image: string;
  price: number;
  category: string;
  brand: string;
};

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

export default function AutocompleteSearch() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current) return;

    const search = autocomplete<ProductHit>({
      container: containerRef.current,
      placeholder: "Search products...",

      onSubmit({ state }) {
        router.push(`/search?q=${state.query}`);
      },

      getSources({ query }) {
        return [

          /* ================= PRODUCTS ================= */
          {
            sourceId: "products",
            getItems() {
              return getAlgoliaResults<ProductHit>({
                searchClient,
                queries: [
                  {
                    indexName: "woocommerce_products",
                    params: {
                      query,
                      hitsPerPage: 5,
                    },
                  },
                ],
              });
            },

            templates: {
              header: () => <div className="px-3 py-1 text-xs font-semibold">Products</div>,
              item({ item, components }) {
                return (
                  <div
                    className="flex gap-3 p-2 cursor-pointer"
                    onClick={() => router.push(`/product/${item.objectID}`)}
                  >
                    <img src={item.image} className="w-10 h-10 rounded" />
                    <div>
                      <components.Highlight hit={item} attribute="name" />
                      <div className="text-xs">${item.price}</div>
                    </div>
                  </div>
                );
              },
            },
          },

          /* ================= CATEGORIES ================= */
          {
            sourceId: "categories",
            getItems() {
              return getAlgoliaResults<ProductHit>({
                searchClient,
                queries: [
                  {
                    indexName: "woocommerce_products",
                    params: { query, hitsPerPage: 10 },
                  },
                ],
              }).then((hits) => {
                const unique = [...new Set(hits.map(h => h.category))];
                return unique.map((c) => ({ name: c }));
              });
            },

            templates: {
              header: () => <div className="px-3 py-1 text-xs font-semibold">Categories</div>,
              item({ item }) {
                return (
                  <div
                    className="p-2 cursor-pointer"
                    onClick={() => router.push(`/product-category/${item.name}`)}
                  >
                    {item.name}
                  </div>
                );
              },
            },
          },

          /* ================= BRANDS ================= */
          {
            sourceId: "brands",
            getItems() {
              return getAlgoliaResults<ProductHit>({
                searchClient,
                queries: [
                  {
                    indexName: "woocommerce_products",
                    params: { query, hitsPerPage: 10 },
                  },
                ],
              }).then((hits) => {
                const unique = [...new Set(hits.map(h => h.brand))];
                return unique.map((b) => ({ name: b }));
              });
            },

            templates: {
              header: () => <div className="px-3 py-1 text-xs font-semibold">Brands</div>,
              item({ item }) {
                return (
                  <div
                    className="p-2 cursor-pointer"
                    onClick={() => router.push(`/brand/${item.name}`)}
                  >
                    {item.name}
                  </div>
                );
              },
            },
          },
        ];
      },
    });

    return () => search.destroy();
  }, [router]);

  return <div ref={containerRef} />;
}