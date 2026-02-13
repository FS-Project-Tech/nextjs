import type { Metadata } from "next";
import { BreadcrumbStructuredData } from "@/components/StructuredData";
import AllCategoriesPageClient from "@/components/AllCategoriesPageClient";

export const metadata: Metadata = {
  title: "All Categories",
  description:
    "Browse all product categories. Find medical supplies, equipment, and more.",
  openGraph: {
    title: "All Categories | Shop by Category",
    description: "Browse all product categories.",
    type: "website",
  },
  alternates: {
    canonical: "/categories",
  },
};

export default function AllCategoriesPage() {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "All Categories" },
  ];

  return (
    <>
      <BreadcrumbStructuredData items={breadcrumbItems} />
      <AllCategoriesPageClient />
    </>
  );
}
