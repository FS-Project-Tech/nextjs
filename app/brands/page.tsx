import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/Container";
import Breadcrumbs from "@/components/Breadcrumbs";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shop by Brand",
  description:
    "Browse all brands and find products from your favorite manufacturers.",
  openGraph: {
    title: "Shop by Brand",
    description:
      "Browse all brands and find products from your favorite manufacturers.",
    type: "website",
  },
  alternates: {
    canonical: "/brands",
  },
};

type Brand = {
  id: number;
  name: string;
  slug: string;
  count?: number;
  image?: string | null;
};

async function getBrands(): Promise<Brand[]> {
  const base =
    process.env.NEXT_PUBLIC_WP_URL;

  try {
    const res = await fetch(`${base}/api/filters/brands`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const brands = Array.isArray(data.brands) ? data.brands : [];

    return brands.sort((a: Brand, b: Brand) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return [];
  }
}

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <main id="main-content" className="min-h-screen py-8">
      <Container>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: "Brands" },
          ]}
        />

        <div className="mt-8">
          <h1 className="text-3xl font-bold text-gray-900">Shop by Brand</h1>
          <p className="mt-2 text-gray-600">
            Browse our brands and find products from your favorite
            manufacturers.
          </p>
          <div className="mt-4 h-1 w-20 rounded-full bg-teal-600" />
        </div>

        {brands.length === 0 ? (
          <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50 px-6 py-12 text-center">
            <p className="text-gray-600">No brands available at the moment.</p>
            <Link
              href="/shop"
              className="mt-4 inline-block font-medium text-teal-600 hover:underline"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Link
                  href={`/brands/${encodeURIComponent(brand.slug)}`}
                  className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm transition-all hover:border-teal-300 hover:shadow-md"
                >
                  <div className="flex min-h-[100px] items-center justify-center rounded-lg bg-gray-50 p-3">
                    {brand.image ? (
                      <div className="relative h-24 w-24 shrink-0">
                        <Image
                          src={brand.image}
                          alt={brand.name}
                          fill
                          className="object-contain"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-2xl font-semibold text-teal-700 group-hover:bg-teal-200">
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <span className="mt-3 block text-sm font-medium text-gray-900 group-hover:text-teal-700">
                    {brand.name}
                  </span>

                  {typeof brand.count === "number" && brand.count > 0 && (
                    <span className="mt-0.5 text-xs text-gray-500">
                      {brand.count} product{brand.count !== 1 ? "s" : ""}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}