import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";

const adapter = new TypesenseInstantSearchAdapter({
  server: {
    apiKey: "YBxhrmgEXolXvN11Xm3fkDBxLRJH8XyV", // 🔐 IMPORTANT
    nodes: [
      {
        host: "owvh09nzpxs34ilqp-1.a2.typesense.net",
        port: "443",
        protocol: "https"
      }
    ]
  },
  additionalSearchParameters: {
    query_by: "name,sku,category,brand"
  }
});

export const searchClient = adapter.searchClient;