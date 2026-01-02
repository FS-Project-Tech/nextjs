"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Container from "@/components/Container";

// Swiper styles
import "swiper/css";
import "swiper/css/navigation";

type Category = {
  id: number;
  name: string;
  slug: string;
  count: number;
  image: string | null;
};

/**
 * Fetch categories via API route
 * Cached & abort-safe
 */
async function fetchCategories(signal: AbortSignal): Promise<Category[]> {
  try {
    const response = await fetch(
      "/api/categories?per_page=100&parent=0&hide_empty=true",
      {
        signal,
        next: { revalidate: 3600 }, // ✅ 1 hour cache
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const categories = Array.isArray(data)
      ? data
      : data.categories || [];

    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.count || 0,
      image: cat.image?.src || cat.image_url || null,
    }));
  } catch (e: any) {
    if (e.name !== "AbortError") {
      console.error("Categories fetch error:", e);
    }
    return [];
  }
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetchCategories(controller.signal)
      .then(setCategories)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  if (!loading && categories.length === 0) return null;

  return (
    <section className="mb-16 py-8">
      <Container>
        {/* Header */}
        <div className="mb-6 text-left">
          <h2 className="text-3xl font-bold text-gray-900">
            Shop by Category
          </h2>
          <p className="text-gray-600">
            Browse our complete product range
          </p>
          <div className="mt-3 h-1 w-24 rounded-full bg-linear-to-r from-teal-500 to-blue-500" />
        </div>

        {/* Skeleton */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
              />
            ))}
          </div>
        ) : (
          <Swiper
            modules={[Navigation]}
            navigation
            className="category-swiper"
            slidesPerView={2}
            spaceBetween={16}
            breakpoints={{
              640: { slidesPerView: 3 },
              768: { slidesPerView: 4 },
              1024: { slidesPerView: 5 },
              1280: { slidesPerView: 7 },
              1536: { slidesPerView: 10 },
            }}
          >
            {categories.map((category) => {
              const imageSrc =
                category.image || "/images/category-placeholder.png";

              return (
                <SwiperSlide key={category.id}>
                  <Link
                    href={`/product-category/${category.slug}`}
                    className="flex h-full flex-col rounded-xl transition-colors"
                  >
                    <div className="flex h-36 items-center justify-center rounded-t-xl">
                      <Image
                        src={imageSrc}
                        alt={category.name}
                        width={120}
                        height={120}
                        sizes="(max-width: 768px) 80px, 120px"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div className="flex min-h-[60px] flex-1 items-center justify-center p-3">
                      <h3 className="line-clamp-2 text-center text-sm font-default text-gray-900">
                        {category.name}
                      </h3>
                    </div>
                  </Link>
                </SwiperSlide>
              );
            })}
          </Swiper>
        )}
      </Container>
    </section>
  );
}
