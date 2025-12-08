import { NextRequest, NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

/**
 * Unified search endpoint
 * Returns lightweight product results for quick search suggestions
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || searchParams.get("query") || "";

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          products: [],
          count: 0,
          query: "",
        },
        { headers: { "Cache-Control": "public, s-maxage=60" } }
      );
    }

    const cleanQuery = query.trim();

    const response = await wcAPI.get("/products", {
      params: {
        status: "publish",
        per_page: 10,
        search: cleanQuery,
        _fields: [
          "id",
          "name",
          "slug",
          "price",
          "regular_price",
          "images",
          "categories",
          "sku",
        ].join(","),
      },
      timeout: 5000, // Short timeout for responsiveness
    });

    const products = Array.isArray(response.data)
      ? response.data.map((product: any) => ({
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          regularPrice: product.regular_price,
          image: product.images?.[0]?.src || null,
          categories: product.categories || [],
          sku: product.sku || null,
        }))
      : [];

    return NextResponse.json(
      {
        products,
        count: products.length,
        query: cleanQuery,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    // Only log non-timeout errors
    if (
      error?.code !== "ECONNABORTED" &&
      error?.code !== "ETIMEDOUT" &&
      !error?.message?.toLowerCase().includes("timeout")
    ) {
      console.error("Unified search error:", error);
    }

    return NextResponse.json(
      {
        products: [],
        count: 0,
        query: "",
      },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=30" } }
    );
  }
}


