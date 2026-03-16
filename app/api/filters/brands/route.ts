import { NextResponse } from "next/server";
import wcAPI from "@/lib/woocommerce";

type Brand = {
  id: number;
  name: string;
  slug: string;
  count?: number;
  image?: string | null;
};

export async function GET() {
  try {
    const response = await wcAPI.get("/products/brands", {
      params: {
        per_page: 100,
      },
    });

    const rawBrands = Array.isArray(response.data) ? response.data : [];

    const brands: Brand[] = rawBrands.map((brand: any) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      count: brand.count ?? 0,
      image: brand.image?.src || brand.image || null,
    }));

    return NextResponse.json(
      { brands },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (error) {
    console.error("Brands API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}