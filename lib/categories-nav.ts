/**
 * Cached categories for the main nav. Uses the same cache keys as /api/categories
 * so nav and API share cache and we avoid duplicate WooCommerce calls.
 */
import { fetchCategories } from "@/lib/woocommerce";
import { cached, categoriesKey, CACHE_TTL, CACHE_TAGS } from "@/lib/cache";

const PARENT_PARAMS = { per_page: 7, parent: 0, hide_empty: true };
const ALL_PARAMS = { per_page: 100, hide_empty: false };

export async function getCategoriesForNav(): Promise<{
  parentCategories: Awaited<ReturnType<typeof fetchCategories>>;
  childCategories: Awaited<ReturnType<typeof fetchCategories>>;
}> {
  const [parentCategories, childCategories] = await Promise.all([
    cached(
      categoriesKey(PARENT_PARAMS),
      () => fetchCategories(PARENT_PARAMS),
      { ttl: CACHE_TTL.CATEGORIES, tags: [CACHE_TAGS.CATEGORIES] }
    ),
    cached(
      categoriesKey(ALL_PARAMS),
      () => fetchCategories(ALL_PARAMS),
      { ttl: CACHE_TTL.CATEGORIES, tags: [CACHE_TAGS.CATEGORIES] }
    ),
  ]);
  return { parentCategories, childCategories };
}
