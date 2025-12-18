// lib/wordpress.ts

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
