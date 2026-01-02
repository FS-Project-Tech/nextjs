import PrefetchLink from "@/components/PrefetchLink";
import { fetchCategories } from "@/lib/woocommerce";
import { Suspense } from "react";
import AllCategoriesDrawer from "@/components/AllCategoriesDrawer";

type Category = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
};

async function CategoriesNavContent() {
  let parentCategories: Category[] = [];
  let childCategories: Category[] = [];

  try {
    parentCategories = await fetchCategories({
      per_page: 7,
      parent: 0,
      hide_empty: true,
    });

    childCategories = await fetchCategories({
      per_page: 100,
      hide_empty: false,
    });
  } catch {
    return null;
  }

  if (!parentCategories.length) return null;

  const subCategoriesMap = childCategories.reduce<Record<number, Category[]>>(
    (acc, cat) => {
      if (cat.parent) {
        acc[cat.parent] = acc[cat.parent] || [];
        acc[cat.parent].push(cat);
      }
      return acc;
    },
    {}
  );

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto w-full sm:w-[85vw] px-4 sm:px-6 lg:px-8">
        <ul
          className="flex items-center gap-3 py-3 text-sm"
          aria-label="Category navigation"
        >
          <li>
            <AllCategoriesDrawer className="px-3 py-1.5 rounded-md hover:bg-gray-50" />
          </li>

          {parentCategories.map((category) => {
            const subCategories = subCategoriesMap[category.id] || [];

            return (
              <li
                key={category.id}
                className="relative group"
              >
                {/* Parent link */}
                <PrefetchLink
                  href={`/product-category/${category.slug}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  aria-haspopup={subCategories.length > 0}
                >
                  {category.name}
                </PrefetchLink>

                {/* Mega submenu */}
                {subCategories.length > 0 && (
                  <div
                    className="absolute left-0 top-full z-50 hidden w-[900px] rounded-lg border bg-white shadow-xl group-hover:flex"
                    role="menu"
                  >
                    {/* LEFT – Subcategories list */}
                    <div className="w-1/3 border-r p-4">
                      <ul className="space-y-2">
                        {subCategories.map((sub) => (
                          <li key={sub.id}>
                            <PrefetchLink
                              href={`/product-category/${sub.slug}`}
                              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            >
                              {sub.name}
                              <span aria-hidden>›</span>
                            </PrefetchLink>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* RIGHT – Category content */}
                    <div className="w-2/3 p-6 flex gap-6">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {category.name}
                        </h3>

                        <p className="mt-2 text-sm text-gray-600 line-clamp-4">
                          {category.description ||
                            "Explore products designed to support independence and daily living."}
                        </p>

                        <PrefetchLink
                          href={`/product-category/${category.slug}`}
                          className="inline-block mt-4 rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition"
                        >
                          Shop This Category
                        </PrefetchLink>
                      </div>

                      {/* Optional image */}
                      <div className="w-48 h-32 bg-gray-100 rounded-md overflow-hidden">
                        {/* Replace with real category image if available */}
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          Category Image
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}

          {/* Fixed links */}
          <li>
            <PrefetchLink href="/#ndis" className="px-3 py-1.5 rounded-md hover:bg-gray-50">
              NDIS
            </PrefetchLink>
          </li>

          <li>
            <PrefetchLink href="/shop" critical className="px-3 py-1.5 rounded-md hover:bg-gray-50">
              Brands
            </PrefetchLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default function CategoriesNav() {
  return (
    <Suspense fallback={<div className="border-b bg-white h-14" />}>
      <CategoriesNavContent />
    </Suspense>
  );
}
