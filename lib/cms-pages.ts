/**
 * Fetch WordPress pages by slug for info/theory pages (privacy, terms, faq, shipping, etc.)
 */
 
const WP_URL = process.env.NEXT_PUBLIC_WP_URL || '';
 
export interface WpPage {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
}
 
export async function fetchPageBySlug(slug: string): Promise<WpPage | null> {
  if (!WP_URL) return null;
  try {
    const res = await fetch(
      `${WP_URL}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`,
      { next: { revalidate:0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data[0] ?? null : data;
  } catch {
    return null;
  }
}