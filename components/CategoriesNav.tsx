import PrefetchLink from "@/components/PrefetchLink";
import { fetchCategories } from "@/lib/woocommerce";
import { Suspense } from "react";
import AllCategoriesDrawer from "@/components/AllCategoriesDrawer";

async function CategoriesNavContent() {
	let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
	try {
		categories = await fetchCategories({ per_page: 7, parent: 0, hide_empty: true });
	} catch {
		categories = [];
	}

	if (!categories || categories.length === 0) {
		return null;
	}

    return (
        <nav className="border-b bg-white">
            <div className="mx-auto w-full sm:w-[85vw] px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
                <ul
                    className="flex items-center gap-2 sm:gap-3 py-2 sm:py-3 text-sm overflow-x-auto whitespace-nowrap md:flex-wrap md:overflow-visible"
                    aria-label="Category navigation"
                >
                    <li className="shrink-0">
                        <AllCategoriesDrawer className="px-3 py-1.5 rounded-md hover:bg-gray-50" />
                    </li>
                    {/* Only the requested fixed links */}
                    <li className="shrink-0">
                        <PrefetchLink href="/product-category/continence-care" prefetch={true} className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">Continence care</PrefetchLink>
                    </li>
                    <li className="shrink-0">
                        <PrefetchLink href="/product-category/urinary-care" prefetch={true} className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">Urinary care</PrefetchLink>
                    </li>
                    <li className="shrink-0">
                        <PrefetchLink href="/product-category/woundcare" prefetch={true} className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">Wound care</PrefetchLink>
                    </li>
                    <li className="shrink-0">
                        <PrefetchLink href="/product-category/skincare" prefetch={true} className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">Skin care</PrefetchLink>
                    </li>
                    <li className="shrink-0">
                        <PrefetchLink href="/product-category/nutrition" prefetch={true} className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">Nutrition</PrefetchLink>
                    </li>
                    <li className="shrink-0">
                        <PrefetchLink href="/product-category/feeding-tube" prefetch={true} className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">Feeding tube</PrefetchLink>
                    </li>
                    <li className="shrink-0">
                        <PrefetchLink href="/#ndis" className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">NDIS</PrefetchLink>
                    </li>
                    <li className="shrink-0">
                        <PrefetchLink href="/shop" critical={true} className="inline-flex items-center px-3 py-1.5 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50">Brands</PrefetchLink>
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
