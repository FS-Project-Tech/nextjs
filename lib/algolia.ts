// lib/algolia.ts
import { algoliasearch } from "algoliasearch";


const client = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,  
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

export const searchClient = client;

const defaultIndexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME || "woo_products";

// Backward-compatible helper so existing scripts can keep calling:
// index.saveObjects(objects)
export const index = {
  saveObjects: (objects: Record<string, unknown>[]) =>
    client.saveObjects({
      indexName: defaultIndexName,
      objects,
    }),
};