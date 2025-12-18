import type { Metadata } from "next";
import ProductsPageClient from "@/components/ProductsPageClient";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import { fetchProductSEO } from "@/lib/wordpress";

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {

  const wpProduct = await fetchProductSEO(params.slug);

  if (!wpProduct?.yoast_head_json) {
    return {
      title: wpProduct?.title?.rendered || "Product",
    };
  }

  const yoast = wpProduct.yoast_head_json;

  return {
    title: yoast.title,
    description: yoast.description,

    openGraph: {
      title: yoast.og_title,
      description: yoast.og_description,
      url: yoast.canonical,
      images: yoast.og_image?.map((img: any) => ({
        url: img.url,
        width: img.width,
        height: img.height,
        alt: img.alt || yoast.title,
      })),
    },

    twitter: {
      card: "summary_large_image",
      title: yoast.twitter_title || yoast.title,
      description: yoast.twitter_description || yoast.description,
      images: yoast.twitter_image ? [yoast.twitter_image] : [],
    },

    alternates: {
      canonical: yoast.canonical,
    },
  };
}


export default function ProductsPage() {
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Products' },
  ];

  return (
    <>
      <BreadcrumbStructuredData items={breadcrumbItems} />
      <ProductsPageClient />
    </>
  );
}
