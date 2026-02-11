"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format-utils";
import { extractProductBrands } from "@/lib/utils/product";
import type { WooCommerceProduct } from "@/lib/woocommerce";

/** Format product attributes for the Attribute column (Pkt/CTN/Each – packaging / selling unit). Prefer packaging-related attributes. */
function formatAttributeColumn(
  attrs: Array<{ name?: string; options?: string[] }>
): string {
  if (!attrs.length) return "—";
  const packagingKeys = ["pkt", "ctn", "each", "pack", "unit", "box", "selling", "attribute", "size"];
  const getRelevance = (name: string) => {
    const n = name.toLowerCase();
    return packagingKeys.some((k) => n.includes(k));
  };
  const packagingAttrs = attrs.filter((a) => getRelevance(String(a.name || "")));
  const preferred = packagingAttrs.length ? packagingAttrs : attrs;
  const parts: string[] = [];
  for (const a of preferred) {
    const options = Array.isArray(a.options) ? a.options : [];
    const value = options.map((o) => String(o).trim()).filter(Boolean).join(", ");
    if (value) parts.push(value);
  }
  return parts.length ? parts.join(" / ") : "—";
}

type SubcategoryDigitalCatalogueProps = {
  subcategorySlug: string;
  subcategoryName: string;
  parentName: string;
};

type TableRow = {
  sku: string;
  name: string;
  attribute: string; // Each (Pkt)/CTN or similar from product attributes
  price: string;
  brand: string;
  slug: string;
};

export default function SubcategoryDigitalCatalogue({
  subcategorySlug,
  subcategoryName,
  parentName,
}: SubcategoryDigitalCatalogueProps) {
  const router = useRouter();
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
          const attrs = (p.attributes || []) as Array<{ name?: string; options?: string[] }>;
          const attributeLabel = formatAttributeColumn(attrs);
          return {
            sku: p.sku || "",
            name: p.name,
            attribute: attributeLabel,
            price: p.price || "",
            brand: brandInfo?.name || "",
            slug: p.slug || "",
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
              <th className="px-3 py-2 border-b border-teal-700 text-left">
                Attribute
              </th>
              <th className="px-3 py-2 border-b border-teal-700 text-left">Price</th>
            </tr>
          </thead>
          <tbody>
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
                    role="button"
                    tabIndex={0}
                    onClick={() => row.slug && router.push(`/products/${row.slug}`)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && row.slug) {
                        e.preventDefault();
                        router.push(`/products/${row.slug}`);
                      }
                    }}
                    className={`cursor-pointer hover:bg-teal-50/70 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.sku || "—"}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.name}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.attribute || "—"}
                    </td>
                    <td className="px-3 py-1.5 border-b border-gray-200">
                      {row.price != null && row.price !== ""
                        ? formatPrice(row.price)
                        : "—"}
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

