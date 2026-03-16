import Image from "next/image";
import Link from "next/link";
import { getFeaturedCategories } from "@/lib/api";

interface CategoryItem {
  category_link?: {
    url?: string;
    target?: string;
  };
  category_image?: {
    url?: string;
    alt?: string;
  };
}

export default async function CategoriesSection() {
  const data = await getFeaturedCategories();
  const updates: CategoryItem[] = data?.acf?.featured_category || [];

  if (!updates.length) return null;

  return (
    <section className="mb-10 marketing-section">
      <div className="container mx-auto grid grid-cols-2 md:grid-cols-10 gap-6">
        {updates.map((item, index) => {
          const imageUrl = item.category_image?.url;
          if (!imageUrl) return null;

          return (
            <Link
              key={index}
              href={item.category_link?.url || "#"}
              target={item.category_link?.target || "_self"}
              className="block overflow-hidden rounded-lg"
            >
              <Image
                src={imageUrl}
                alt={item.category_image?.alt || "Featured Category"}
                width={600}
                height={400}
                sizes="(max-width:768px) 50vw, 20vw"
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}