import { MeiliSearch } from "meilisearch";

export const meili = new MeiliSearch({
  host: process.env.NEXT_PUBLIC_MEILI_URL!,
  apiKey: process.env.NEXT_PUBLIC_MEILI_KEY!
});
