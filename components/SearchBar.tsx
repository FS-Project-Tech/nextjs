// "use client";

// import { algoliaClient } from "@/lib/algolia";
// import {
//   InstantSearch,
//   SearchBox,
//   Hits,
//   RefinementList,
//   Pagination
// } from "react-instantsearch";

// interface SearchBarProps {
//   className?: string;
// }

// export default function ProductSearch({ className }: SearchBarProps) {
//   return (
//     <div className={className}>
//     <InstantSearch
//       searchClient={algoliaClient}
//       indexName="woocommerce_products"
//     >
//       <SearchBox placeholder="Search products..." />

//       <RefinementList attribute="categories" />

//       <Hits
//         classNames={{
//           list: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6",
//           item: "h-full"
//         }}
//       />


//       <Pagination />
//     </InstantSearch>
//     </div>
//   );
// }
