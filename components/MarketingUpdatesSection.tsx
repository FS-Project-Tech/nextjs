<<<<<<< HEAD
import Image from "next/image"
import Link from "next/link"
import { getMarketingUpdates } from "@/lib/api"
import { mapWpToFrontendUrl } from "@/lib/urlMapper"    

export default async function MarketingSection() {
  const data = await getMarketingUpdates()
  const updates = data?.acf?.marketing_updates

=======
// import MarketingUpdatesClient from "@/components/MarketingUpdatesClient";

// async function fetchMarketingUpdates() {
//   const endpoint = process.env.WP_GRAPHQL_ENDPOINT;

//   if (!endpoint) {
//     console.error("WP_GRAPHQL_ENDPOINT not defined");
//     return [];
//   }

//   try {
//     const res = await fetch(endpoint, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         query: `
//           query MarketingUpdates {
//             page(id: "/", idType: URI) {
//               homeMarketingUpdates {
//                 marketingUpdates {
//                   marketingImage {
//                     node {
//                       sourceUrl
//                       altText
//                     }
//                   }
//                   marketingLink {
//                     url
//                     title
//                     target
//                   }
//                 marketingLink {
//                   url
//                   title
//                   target
//                 }
//                 }
//               }
//             }
//           }
//         }
//         `,
//       }),
//       next: { revalidate: 300 },
//     });

//     const text = await res.text();

//     let json: any;
//     try {
//       json = JSON.parse(text);
//     } catch (parseError) {
//       console.error(
//         "MarketingUpdatesSection: non-JSON response from WP_GRAPHQL_ENDPOINT",
//         parseError
//       );
//       return [];
//     }

//     const updates =
//       json?.data?.page?.homeMarketingUpdates?.marketingUpdates || [];

//     return Array.isArray(updates) ? updates : [];
//   } catch (error) {
//     console.error("MarketingUpdatesSection: failed to fetch updates", error);
//     return [];
//   }
// }

// export default async function MarketingUpdatesSection() {
//   const updates = await fetchMarketingUpdates();
//   if (!updates.length) return null;

//   return <MarketingUpdatesClient updates={updates} />;
// }

import Image from "next/image"
import Link from "next/link"
import { getMarketingUpdates } from "@/lib/api"
import { mapWpToFrontendUrl } from "@/lib/urlMapper"    

export default async function MarketingSection() {
  const data = await getMarketingUpdates()
  const updates = data?.acf?.marketing_updates

>>>>>>> 4be804d (product-card-design,remove-dualbanner,add-newbanner,guestmode)
  if (!updates || updates.length === 0) return null

  return (
    <section className="mb-10 marketing-section">
    <div className="grid grid-cols-3 gap-6 mx-auto container">
      {updates.map((item: any, index: number) => (
        <Link
          key={index}
          href={mapWpToFrontendUrl(item.marketing_link?.url || "#")}
          target={item.marketing_link?.target || "_self"}
        >
          <Image
            src={item.marketing_image?.url}
            alt={item.marketing_image?.alt || "Marketing"}
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