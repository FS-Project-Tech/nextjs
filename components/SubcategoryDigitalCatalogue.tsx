"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { extractProductBrands } from "@/lib/utils/product";
import type { WooCommerceProduct } from "@/lib/woocommerce";

type SubcategoryDigitalCatalogueProps = {
  subcategorySlug: string;
  subcategoryName: string;
  parentName: string;
};

type TableRow = {
  sku: string;
  name: string;
  size: string;
  price: string;
  brand: string;
};

export default function SubcategoryDigitalCatalogue({
  subcategorySlug,
  subcategoryName,
  parentName,
}: SubcategoryDigitalCatalogueProps) {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          categorySlug: subcategorySlug,
          per_page: "200",
          page: "1",
        });
        const res = await fetch(`/api/products?${params.toString()}`);
        const json = await res.json();
        const products: WooCommerceProduct[] = Array.isArray(json.products)
          ? json.products
          : [];

        if (cancelled) return;

        const mapped: TableRow[] = products.map((p) => {
          const brandInfo = extractProductBrands(p)[0];
          const sizeAttr = (p.attributes || []).find((a: any) =>
            String(a.name || "").toLowerCase().includes("size")
          );
          const size =
            sizeAttr && Array.isArray(sizeAttr.options) && sizeAttr.options.length
              ? String(sizeAttr.options[0])
              : "";
          return {
            sku: p.sku || "",
            name: p.name,
            size,
            price: p.price || "",
            brand: brandInfo?.name || "",
          };
        });

        setRows(mapped);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [subcategorySlug]);

  const rowsByBrand = useMemo(() => {
    const map = new Map<string, TableRow[]>();
    rows.forEach((r) => {
      const key = r.brand || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[360px] bg-white rounded-xl shadow-sm">
        <p className="text-gray-500 text-sm">Loading digital catalogue…</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex items-center justify-center min-h-[360px] bg-white rounded-xl shadow-sm">
        <p className="text-gray-500 text-sm">
          No products found for this subcategory.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
      <div className="px-4 py-3 bg-teal-700 text-white">
        <h2 className="text-lg font-semibold">{subcategoryName}</h2>
        <p className="text-xs text-teal-100">{parentName}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-teal-600 text-white">
              <th className="px-3 py-2 border-b border-teal-700 text-left">SKU Code</th>
              <th className="px-3 py-2 border-b border-teal-700 text-left">
                Product Name
              </th>
              <th className="px-3 py-2 border-b border-teal-700 text-left">Size</th>
              <th className="px-3 py-2 border-b border-teal-700 text-left">Price</th>
            </tr>
          </thead>
          <tbody>
            {/* Optional group row for subcategory title (like Absorbent Dressing) */}
            <tr className="bg-teal-50">
              <td
                colSpan={4}
                className="px-3 py-2 font-semibold text-teal-900 border-b border-teal-200"
              >
                {subcategoryName}
              </td>
            </tr>

            {rowsByBrand.map(([brand, items]) => (
              <Fragment key={brand || "other"}>
                {brand && (
                  <tr className="bg-gray-100">
                    <td
                      colSpan={4}
                      className="px-3 py-2 font-semibold text-gray-800 border-b border-gray-300"
                    >
                      {brand}
                    </td>
                  </tr>
                )}
                {items.map((row, idx) => (
                  <tr
                    key={`${row.sku}-${idx}`}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.sku || "—"}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.name}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.size || "—"}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.price || "—"}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

