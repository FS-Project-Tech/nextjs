import type { Metadata } from "next";
import ProductsPageClient from "@/components/ProductsPageClient";
import { BreadcrumbStructuredData } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse all products in our store. Find what you're looking for with our comprehensive product catalog.",
  openGraph: {
    title: "Products | WooCommerce Store",
    description: "Browse all products in our store.",
    type: "website",
  },
  alternates: {
    canonical: "/products",
  },
};

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
