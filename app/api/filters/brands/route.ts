import { NextRequest, NextResponse } from "next/server";

const WP = process.env.WP_API_URL!;

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const url = category
    ? `${WP}/wp-json/custom/v1/brands?category=${category}`
    : `${WP}/wp-json/custom/v1/brands`;

  const res = await fetch(url, {
    next: { revalidate: 600 }
  });

  const brands = await res.json();

  return NextResponse.json({ brands });

}