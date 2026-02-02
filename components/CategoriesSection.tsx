"use client";

import { useEffect, useState, Fragment } from "react";
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

const INITIAL_MOBILE_COUNT = 11; // 3 rows (4 + 4 + 3 categories) before "View all"

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
        next: { revalidate: 3600 },
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

function CategoryCard({
  category,
  className = "",
}: {
  category: Category;
  className?: string;
}) {
  const imageSrc =
    category.image || "/images/category-placeholder.png";

  return (
    <Link
      href={`/product-category/${category.slug}`}
      className={`flex h-full flex-col rounded-xl border border-gray-200 bg-white overflow-hidden transition-colors hover:border-teal-300 hover:shadow-md ${className}`}
    >
      <div className="flex h-24 sm:h-28 md:h-32 items-center justify-center rounded-t-xl bg-gray-50">
        <Image
          src={imageSrc}
          alt={category.name}
          width={120}
          height={120}
          sizes="(max-width: 768px) 80px, 120px"
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="flex min-h-[48px] flex-1 items-center justify-center px-2 py-2">
        <h3 className="line-clamp-2 text-center text-xs sm:text-sm font-medium text-gray-900">
          {category.name}
        </h3>
      </div>
    </Link>
  );
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchCategories(controller.signal)
      .then(setCategories)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  if (!loading && categories.length === 0) return null;

  // Mobile layout: 3 rows initially → 4 + 4 + 3 categories (11 total),
  // with the 4th slot in the last row used for the \"View all\" button.
  const visibleCategories = categories.slice(0, INITIAL_MOBILE_COUNT);
  const hasMore = categories.length > INITIAL_MOBILE_COUNT;
  const restSlice = categories.slice(INITIAL_MOBILE_COUNT);

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

        {loading ? (
          <div className="grid grid-cols-4 gap-3 px-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-48 animate-pulse rounded-xl border border-gray-200 bg-gray-50"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Mobile: 4 per row, 3 rows (4 + 4 + 3 categories) + View all in the 4th slot of the last row */}
            <div className="grid grid-cols-4 gap-3 px-2 md:hidden">
              {visibleCategories.map((category, index) => (
                <Fragment key={category.id}>
                  <CategoryCard category={category} />
                  {hasMore && !expanded && index === visibleCategories.length - 1 && (
                    <button
                      type="button"
                      onClick={() => setExpanded(true)}
                      className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 py-6 text-teal-700 transition-colors hover:bg-teal-50 hover:border-teal-400"
                    >
                      <span className="text-sm font-semibold">View all</span>
                      <span className="mt-1 text-xs text-teal-600">
                        {categories.length - INITIAL_MOBILE_COUNT} more
                      </span>
                    </button>
                  )}
                </Fragment>
              ))}
              {expanded &&
                restSlice.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              {expanded && hasMore && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="col-span-4 flex min-h-[56px] items-center justify-center rounded-xl border border-gray-300 bg-gray-100 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Show less
                </button>
              )}
            </div>

            {/* Desktop: Swiper slider */}
            <div className="hidden md:block">
              <Swiper
                modules={[Navigation]}
                navigation
                className="category-swiper"
                slidesPerView={4}
                spaceBetween={16}
                breakpoints={{
                  1024: { slidesPerView: 5 },
                  1280: { slidesPerView: 7 },
                  1536: { slidesPerView: 10 },
                }}
              >
                {categories.map((category) => (
                  <SwiperSlide key={category.id}>
                    <CategoryCard category={category} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </>
        )}
      </Container>
    </section>
  );
}
