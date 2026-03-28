import Typesense from "typesense";

const client = new Typesense.Client({
  nodes: [{
    host: process.env.NEXT_PUBLIC_TYPESENSE_HOST!,
    port: 443,
    protocol: "https"
  }],
  apiKey: process.env.NEXT_PUBLIC_TYPESENSE_API_KEY!
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const res = await client.collections(process.env.NEXT_PUBLIC_TYPESENSE_INDEX_NAME!).documents().search({
    q,
    query_by: "name,sku"
  });

  return Response.json(res);
}