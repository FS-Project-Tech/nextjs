import PrefetchLink from "@/components/PrefetchLink";
import { getCategoriesForNav } from "@/lib/categories-nav";
import { Suspense } from "react";
import AllCategoriesDrawer from "@/components/AllCategoriesDrawer";
import { ChevronDown } from "lucide-react";

type Category = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  // description?: string;
};
const NDIS_SUBMENU = [
  { name: "About NDIS", slug: "about-ndis" },
  { name: "How to Apply", slug: "how-to-apply" },
  { name: "NDIS Products", slug: "ndis-products" },
  { name: "Eligibility", slug: "eligibility" },
];

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
                    className="absolute left-0 top-full z-50 hidden max-w-[900px] w-[90vw] rounded-lg border bg-white shadow-xl group-hover:flex"
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
                  </div>
                )}
              </li>
            );
          })}

          <li>
            <PrefetchLink href="/brands/" className="px-3 py-1.5 hover:bg-nav-hover text-white">
              Brands
            </PrefetchLink>
          </li>
          <li className="relative group">
            {/* Parent */}
            <PrefetchLink
              href="/ndis/"
              className="inline-flex items-center px-3 py-2 text-white hover:bg-nav-hover"
              aria-haspopup={NDIS_SUBMENU.length > 0}
            >
              NDIS
              <ChevronDown
                size={18}
                className="transition-transform duration-200 group-hover:rotate-180"
              />
            </PrefetchLink>

            {/* Submenu */}
            {NDIS_SUBMENU.length > 0 && (
              <div className="absolute left-0 top-full z-50 hidden w-[250px] rounded-lg border bg-white shadow-xl group-hover:block">
                <ul className="p-3 space-y-1">
                  {NDIS_SUBMENU.map((item) => (
                    <li key={item.slug}>
                      <PrefetchLink
                        href={`/ndis/${item.slug}`}
                        className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {item.name}
                      </PrefetchLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
          <li>
            <PrefetchLink href="/funcing-scheme/" className="px-3 py-1.5 hover:bg-nav-hover text-white">
              Funding Scheme
            </PrefetchLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default async function CategoriesNav() {
  return <CategoriesNavContent />;
}
