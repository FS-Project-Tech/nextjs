import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrandPageClient from "@/components/BrandPageClient";
import { fetchBrandBySlug } from "@/lib/wordpress";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const brands = await getBrands();
    return brands.map((b) => ({ slug: b.slug }));
  } catch {
    return [];
  }
}

type Brand = {
  id: number;
  name: string;
  slug: string;
  count?: number;
  image?: string | null;
  description?: string | null;
};

async function getBrands(): Promise<Brand[]> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  try {
    const res = await fetch(`${base}/api/filters/brands`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.brands) ? data.brands : [];
  } catch {
    return [];
  }
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);
  const brands = await getBrands();
  const brand = brands.find((b) => b.slug.toLowerCase() === decodedSlug.toLowerCase());
  if (!brand) return { title: "Brand" };
  return {
    title: `${brand.name} | Brands`,
    description: `Shop ${brand.name} products. Browse all ${brand.name} items.`,
    openGraph: {
      title: `${brand.name} | Brands`,
      description: `Shop ${brand.name} products.`,
      type: "website",
    },
    alternates: {
      canonical: `/brands/${decodedSlug}`,
    },
  };
}

export default async function BrandSlugPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const decodedSlug = decodeURIComponent(slug);

  const [brands, wpBrand] = await Promise.all([
    getBrands(),
    fetchBrandBySlug(decodedSlug).catch(() => null),
  ]);

  const brand = brands.find((b) => b.slug.toLowerCase() === decodedSlug.toLowerCase());
  if (!brand) notFound();

  const description = wpBrand?.description ?? brand.description ?? null;
  const displayName = wpBrand?.name ?? brand.name;

  return (
    <main id="main-content">
      <BrandPageClient
        brandSlug={brand.slug}
        brandName={displayName}
        brandDescription={description}
      />
    </main>
  );
}
