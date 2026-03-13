import PrefetchLink from "@/components/PrefetchLink";
import { getCategoriesForNav } from "@/lib/categories-nav";
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
    const { parentCategories: parent, childCategories: child } =
      await getCategoriesForNav();
    parentCategories = parent;
    childCategories = child;
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
    <nav className="bg-nav-header hidden md:block">
      <div className="container mx-auto w-full sm:w-[85vw]">
        <ul
          className="flex items-center gap-3 text-sm"
          aria-label="Category navigation"
        >
          <li>
            <AllCategoriesDrawer className="px-3 py-2 text-white" />
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
                  className="inline-flex items-center px-3 py-2 text-white hover:bg-nav-hover"
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

          {/* Fixed links – NDIS goes to dedicated NDIS page */}
          <li>
            <PrefetchLink href="/ndis" className="px-3 py-1.5 hover:bg-nav-hover text-white">
              NDIS
            </PrefetchLink>
          </li>

          <li>
            <PrefetchLink href="/brands" className="px-3 py-1.5 hover:bg-nav-hover text-white">
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
