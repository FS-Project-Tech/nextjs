// scripts/sync-products.ts
import { index } from "../lib/algolia";

async function syncProducts() {
  const res = await fetch(
    `${process.env.WC_API_URL}/products?per_page=100`, 
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.WC_CONSUMER_KEY +
              ":" +
              process.env.WC_CONSUMER_SECRET
          ).toString("base64"),
      },
    }
  );

  const products = await res.json();

  const formatted = products.map((p: any) => ({
    objectID: p.id,

    // 🔹 Basic
    name: p.name,
    slug: p.slug,
    permalink: p.permalink,

    // 🔹 Pricing
    price: parseFloat(p.price || 0),
    regular_price: parseFloat(p.regular_price || 0),
    sale_price: parseFloat(p.sale_price || 0),
    on_sale: p.on_sale,

    // 🔹 Media
    image: p.images?.[0]?.src || "",

    // 🔹 Content
    description: p.description,
    short_description: p.short_description,

    // 🔹 Inventory
    sku: p.sku,
    stock_status: p.stock_status,
    stock_quantity: p.stock_quantity,

    // 🔹 Categories & Taxonomies
    categories: p.categories?.map((c: any) => c.name) || [],
    category_slugs: p.categories?.map((c: any) => c.slug) || [],

    tags: p.tags?.map((t: any) => t.name) || [],
    tag_slugs: p.tags?.map((t: any) => t.slug) || [],

    // 🔹 Custom Taxonomies (like brands)
    brand: p.brands?.[0]?.name || "",
    brand_slug: p.brands?.[0]?.slug || "",

    // 🔹 Extra useful fields
    rating: p.average_rating,
    total_sales: p.total_sales,
    featured: p.featured,
  }));

  await index.saveObjects(formatted);

  console.log("✅ Synced to Algolia");
}

syncProducts();