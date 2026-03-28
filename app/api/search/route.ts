import { client } from "@/lib/meili";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  const skus = q.split(/[,\s]+/).filter(Boolean);

  let result;

  if (skus.length > 1) {
    // ✅ SKU filter
    result = await client.index("JoyaProducts").search("", {
      filter: `sku IN [${skus.map((s) => `"${s}"`).join(",")}]`,
    });
  } else {
    // ✅ normal search
    result = await client.index("JoyaProducts").search(q);
  }

  return Response.json(result);
}