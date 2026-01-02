import MarketingUpdatesClient from "@/components/MarketingUpdatesClient";

async function fetchMarketingUpdates() {
  const endpoint = process.env.WP_GRAPHQL_ENDPOINT;

  if (!endpoint) {
    console.error("WP_GRAPHQL_ENDPOINT not defined");
    return [];
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query MarketingUpdates {
          page(id: "/", idType: URI) {
            homeMarketingUpdates {
              marketingUpdates {
                marketingImage {
                  node {
                    sourceUrl
                    altText
                  }
                }
                marketingLink {
                  url
                  title
                  target
                }
              }
            }
          }
        }
      `,
    }),
    next: { revalidate: 300 },
  });

  const json = await res.json();

  return (
    json?.data?.page?.homeMarketingUpdates?.marketingUpdates || []
  );
}

export default async function MarketingUpdatesSection() {
  const updates = await fetchMarketingUpdates();
  if (!updates.length) return null;

  return <MarketingUpdatesClient updates={updates} />;
}