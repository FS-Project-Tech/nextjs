import Typesense from "typesense/lib/Typesense";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!process.env.TYPESENSE_HOST || !process.env.TYPESENSE_ADMIN_KEY) {
      return Response.json({ hits: [] });
    }

    const client = new Typesense.Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST,
          port: 443,
          protocol: "https",
        },
      ],
      apiKey: process.env.TYPESENSE_ADMIN_KEY,
    });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q) {
      return Response.json({ hits: [] });
    }

    const formattedQuery = q
      .split(/[,\/&\s]+/)
      .map((q) => q.trim())
      .filter(Boolean)
      .join(" || ");

    const res = await client
      .collections("products")
      .documents()
      .search({
        q: formattedQuery,
        query_by: "sku,name,category,brand",
      });

    return Response.json(res);

  } catch (error) {
    console.error("Search API error:", error);
    return Response.json({ hits: [] });
  }
}