import { fetchCategories } from "@/lib/woocommerce";
import { cached, categoriesKey, CACHE_TTL, CACHE_TAGS } from "@/lib/cache";

const ALL_PARAMS = { per_page: 100, hide_empty: false };

const NAV_PARENT_SLUGS = [
  "continence-care",
  "woundcare",
  "urinary-care",
  "skincare",
  "nutrition",
];

export async function getCategoriesForNav() {
  const allCategories = await cached(
    categoriesKey(ALL_PARAMS),
    () => fetchCategories(ALL_PARAMS),
    {
      ttl: CACHE_TTL.CATEGORIES,
      tags: [CACHE_TAGS.CATEGORIES],
    }
  );

  const parentCategories = NAV_PARENT_SLUGS
  .map((slug) => allCategories.find((cat) => cat.slug === slug))
  .filter((cat): cat is typeof allCategories[number] => Boolean(cat));

  const parentIds = parentCategories.map((cat) => cat.id);

  const childCategories = allCategories.filter((cat) =>
    parentIds.includes(cat.parent)
  );

  return {
    parentCategories,
    childCategories,
  };
}