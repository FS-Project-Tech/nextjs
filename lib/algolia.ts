import { liteClient as algoliasearch } from "algoliasearch/lite";

const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;

export const searchClient =
  appId && apiKey
    ? algoliasearch(appId, apiKey)
    : ({search: async () => ({ results: [] })}) as unknown as ReturnType<typeof algoliasearch>;