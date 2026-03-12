<<<<<<< HEAD
import Image from "next/image"
import Link from "next/link"
import { getFeaturedCategories } from "@/lib/api"

=======
// // "use client";

// // import { useEffect, useState } from "react";
// // import Link from "next/link";
// // import Image from "next/image";
// // import Container from "@/components/Container";
// // import { ArrowRight } from "lucide-react";

// // type Category = {
// //   id: number;
// //   name: string;
// //   slug: string;
// //   count: number;
// //   image: string | null;
// // };

// // const CATEGORIES_TO_SHOW = 12; // Show this many in the grid; "View all" links to shop

// // /**
// //  * Fetch categories via API route
// //  * Cached & abort-safe
// //  */
// // async function fetchCategories(signal: AbortSignal): Promise<Category[]> {
// //   try {
// //     const response = await fetch(
// //       "/api/categories?per_page=100&parent=0&hide_empty=true",
// //       {
// //         signal,
// //         next: { revalidate: 3600 },
// //       }
// //     );

// //     if (!response.ok) return [];

// //     const data = await response.json();
// //     const categories = Array.isArray(data)
// //       ? data
// //       : data.categories || [];

// //     return categories.map((cat: any) => ({
// //       id: cat.id,
// //       name: cat.name,
// //       slug: cat.slug,
// //       count: cat.count || 0,
// //       image: cat.image?.src || cat.image_url || null,
// //     }));
// //   } catch (e: any) {
// //     if (e.name !== "AbortError") {
// //       console.error("Categories fetch error:", e);
// //     }
// //     return [];
// //   }
// // }

// // function CategoryCard({
// //   category,
// //   className = "",
// // }: {
// //   category: Category;
// //   className?: string;
// // }) {
// //   const imageSrc =
// //     category.image || "/images/category-placeholder.png";

// //   return (
// //     <Link
// //       href={`/product-category/${category.slug}`}
// //       className={`flex h-full flex-row items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-teal-300 hover:shadow-md sm:p-4 ${className}`}
// //     >
// //       <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-teal-50 sm:h-24 sm:w-24">
// //         <Image
// //           src={imageSrc}
// //           alt={category.name}
// //           width={96}
// //           height={96}
// //           sizes="96px"
// //           className="h-10 w-10 object-contain sm:h-14 sm:w-14"
// //         />
// //       </div>
// //       <h3 className="min-w-0 flex-1 line-clamp-2 text-left text-xs font-medium text-gray-900 sm:text-sm">
// //         {category.name}
// //       </h3>
// //     </Link>
// //   );
// // }

// // export default function CategoriesSection() {
// //   const [categories, setCategories] = useState<Category[]>([]);
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     const controller = new AbortController();

// //     fetchCategories(controller.signal)
// //       .then(setCategories)
// //       .finally(() => setLoading(false));

// //     return () => controller.abort();
// //   }, []);

// //   if (!loading && categories.length === 0) return null;

// //   const visibleCategories = categories.slice(0, CATEGORIES_TO_SHOW);
// //   const hasMore = categories.length > CATEGORIES_TO_SHOW;

// //   return (
// //     <section className="mb-16 py-8">
// //       <Container>
// //         {/* Header */}
// //         <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
// //           <div>
// //             <h2 className="text-3xl font-bold text-gray-900">
// //               Shop by Category
// //             </h2>
// //             <p className="mt-1 text-gray-600">
// //               Browse our complete product range
// //             </p>
// //             <div className="mt-3 h-1 w-24 rounded-full bg-teal-500" />
// //           </div>
// //           {!loading && hasMore && ( 
// //             <Link
// //               href="/categories"
// //               className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 sm:mt-0"
// //             >
// //               View all
// //               <ArrowRight className="h-4 w-4" />
// //             </Link>
// //           )}
// //         </div>

// //         {loading ? (
// //           <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
// //             {Array.from({ length: 12 }).map((_, index) => (
// //               <div
// //                 key={index}
// //                 className="h-20 animate-pulse rounded-xl border border-gray-200 bg-gray-50 sm:h-24"
// //               />
// //             ))}
// //           </div>
// //         ) : (
// //           <>
// //             <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
// //               {visibleCategories.map((category) => (
// //                 <CategoryCard key={category.id} category={category} />
// //               ))}
// //             </div>
// //           </>
// //         )}
// //       </Container>
// //     </section>
// //   );
// // }


// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";
// import Container from "@/components/Container";
// import { ArrowRight } from "lucide-react";

// type Category = {
//   id: number;
//   name: string;
//   slug: string;
//   count: number;
// };

// const CATEGORIES_TO_SHOW = 6;

// /**
//  * Fetch categories via API route
//  */
// async function fetchCategories(signal: AbortSignal): Promise<Category[]> {
//   try {
//     const response = await fetch(
//       "/api/categories?per_page=100&parent=0&hide_empty=true",
//       {
//         signal,
//         next: { revalidate: 3600 },
//       }
//     );

//     if (!response.ok) return [];

//     const data = await response.json();
//     const categories = Array.isArray(data)
//       ? data
//       : data.categories || [];

//     return categories.map((cat: any) => ({
//       id: cat.id,
//       name: cat.name,
//       slug: cat.slug,
//       count: cat.count || 0,
//     }));
//   } catch (e: any) {
//     if (e.name !== "AbortError") {
//       console.error("Categories fetch error:", e);
//     }
//     return [];
//   }
// }

// function CategoryCard({
//   category,
// }: {
//   category: Category;
// }) {
//   return (
//     <Link
//       href={`/product-category/${category.slug}`}
//       className="
//         flex items-center justify-center
//         h-[100px]                       /* reduced height */
//         rounded-xl                     /* smoother corners */
//         border border-gray-200
//         bg-[#b6ddf0]                   /* single soft color */
//         px-10
//         text-sm font-medium text-gray-800
//         text-center
//         transition-all duration-200
  
//       "
//     >
//       {category.name}
//     </Link>
//   );
// }

// export default function CategoriesSection() {
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const controller = new AbortController();

//     fetchCategories(controller.signal)
//       .then(setCategories)
//       .finally(() => setLoading(false));

//     return () => controller.abort();
//   }, []);

//   if (!loading && categories.length === 0) return null;

//   const visibleCategories = categories.slice(0, CATEGORIES_TO_SHOW);
//   const hasMore = categories.length > CATEGORIES_TO_SHOW;

//   return (
//     <section className="mb-16 py-8">
//       <Container>
//         {/* Header */}
//         <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
//           <div>
//             <h2 className="text-3xl font-bold text-gray-900">
//               Shop by Category
//             </h2>
//             <p className="mt-1 text-gray-600">
//               Browse our complete product range
//             </p>
//             <div className="mt-3 h-1 w-24 rounded-full bg-teal-500" />
//           </div>

//           {!loading && hasMore && (
//             <Link
//               href="/categories"
//               className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 sm:mt-0"
//             >
//               View all
//               <ArrowRight className="h-4 w-4" />
//             </Link>
//           )}
//         </div>

//         {/* Grid Layout */}
//         {loading ? (
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
//             {Array.from({ length: 12 }).map((_, index) => (
//               <div
//                 key={index}
//                 className="h-12 animate-pulse rounded-md border border-gray-300 bg-gray-100"
//               />
//             ))}
//           </div>
//         ) : (
// <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
//   {visibleCategories.map((category) => (
//     <CategoryCard key={category.id} category={category} />
//   ))}
// </div>
//         )}
//       </Container>
//     </section>
//   );
// }

import Image from "next/image"
import Link from "next/link"
import { getFeaturedCategories } from "@/lib/api"

>>>>>>> 4be804d (product-card-design,remove-dualbanner,add-newbanner,guestmode)
export default async function CategoriesSection() {
  const data = await getFeaturedCategories()
  const updates = data?.acf?.featured_category

  if (!updates || updates.length === 0) return null

  return (
    <section className="mb-10 marketing-section">
    <div className="grid grid-cols-10 gap-6 mx-auto container">
      {updates.map((item: any, index: number) => (
        <Link
          key={index}
          href={item.category_link?.url || "#"}
          target={item.category_link?.target || "_self"}
        >
          <Image
            src={item.category_image?.url}
            alt={item.category_image?.alt || "Featured Category"}
            className="w-full h-full object-cover rounded-lg"
            width={600}
            height={400}
          />
        </Link>
      ))}
    </div>
    </section>
  )
}