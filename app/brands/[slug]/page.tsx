import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BrandPageClient from "@/components/BrandPageClient";

export const revalidate = 3600;
export const dynamicParams = true;

type Brand = {
  id: number;
  name: string;
  slug: string;
  count?: number;
  image?: string | null;
  description?: string | null;
};

// ✅ Fetch ALL brands (for static params + metadata)
async function getBrands(): Promise<Brand[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/custom/v1/brands`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// ✅ Static paths
export async function generateStaticParams() {
  const brands = await getBrands();
  return brands.map((b) => ({ slug: b.slug }));
}

// ✅ SEO metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const brands = await getBrands();
  const brand = brands.find(
    (b) => b.slug.toLowerCase() === decodedSlug.toLowerCase()
  );

  if (!brand) return { title: "Brand" };

  return {
    title: `${brand.name} | Brands`,
    description: `Buy ${brand.name} products at best prices. Explore full range of ${brand.name}.`,
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

// ✅ Page
export default async function BrandSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const brands = await getBrands();

  const brand = brands.find(
    (b) => b.slug.toLowerCase() === decodedSlug.toLowerCase()
  );

  if (!brand) notFound();

  return (
    <main id="main-content">
      <BrandPageClient
        brandSlug={brand.slug}
        brandName={brand.name}
        brandDescription={brand.description ?? null}
      />
    </main>
  );
}