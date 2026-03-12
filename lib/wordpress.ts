export async function fetchProductSEO(slug: string) {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wp/v2/product?slug=${slug}`,
      {
        next: { revalidate: 300 }, // match your ISR
      }
    );
  
    if (!res.ok) {
      return null;
    }
  
    const data = await res.json();
    return data?.[0] || null;
  }
  

  // lib/wordpress.ts
export async function fetchCategorySEO(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wp/v2/product_cat?slug=${slug}`,
    { next: { revalidate: 600 } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return data?.[0] || null;
}

/** Fetch brand by slug from WordPress (e.g. /brand/3m/ – plugin may register product_brand or similar). */
export async function fetchBrandBySlug(slug: string): Promise<{ name?: string; description?: string } | null> {
  const base = process.env.NEXT_PUBLIC_WP_URL;
  if (!base) return null;
  const slugEnc = encodeURIComponent(slug);
  const endpoints = [
    `/wp-json/wp/v2/product_brand?slug=${slugEnc}`,
    `/wp-json/wp/v2/pa_brand?slug=${slugEnc}`,
    `/wp-json/wp/v2/brand?slug=${slugEnc}`,
  ];
  for (const path of endpoints) {
    try {
      const res = await fetch(`${base}${path}`, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      const term = Array.isArray(data) ? data[0] : data;
      if (term && (term.name || term.slug)) {
        return {
          name: term.name,
          description: term.description ? String(term.description).replace(/<[^>]+>/g, "").trim() : undefined,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}
