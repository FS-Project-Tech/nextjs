"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Container from "@/components/Container";

// Import Swiper styles
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
 * Fetch categories via API route (server-side only)
 * Never call WooCommerce API directly from client components
 */
async function getCategoriesWithImages(): Promise<Category[]> {
  try {
    const response = await fetch("/api/categories?per_page=100&parent=0&hide_empty=true", {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const categories = Array.isArray(data) ? data : data.categories || [];
    
    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.count || 0,
      image: cat.image?.src || cat.image_url || null,
    }));
  } catch {
    // Component handles empty array gracefully (returns null if no categories)
    return [];
  }
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    getCategoriesWithImages()
      .then((data) => {
        if (mountedRef.current) setCategories(data);
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!loading && categories.length === 0) {
    return null;
  }

  const displayCategories = categories.slice(0, 10);

  return (
    <section className="mb-16 py-8">
      <Container>
        <div className="mb-6 text-left">
          <h2 className="text-3xl font-bold text-gray-900">Shop by Category</h2>
          <p className="text-gray-600">Browse our complete product range</p>
          <div className="mt-3 w-24 h-1 bg-linear-to-r from-teal-500 to-blue-500 rounded-full" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-48 rounded-xl border border-gray-200 bg-gray-50 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="relative">
            <Swiper
              modules={[Navigation]}
              navigation
              className="!px-0 category-swiper"
              slidesPerView={2}
              spaceBetween={16}
              breakpoints={{
                640: {
                  slidesPerView: 3,
                  spaceBetween: 16,
                },
                768: {
                  slidesPerView: 4,
                  spaceBetween: 16,
                },
                1024: {
                  slidesPerView: 5,
                  spaceBetween: 16,
                },
                1280: {
                  slidesPerView: 7,
                  spaceBetween: 16,
                },
                1536: {
                  slidesPerView: 10,
                  spaceBetween: 16,
                },
              }}
            >
              {displayCategories.map((category) => {
                const categoryImage =
                  category.image || `https://picsum.photos/200/200?random=${category.id}`;

                return (
                  <SwiperSlide key={category.id} style={{ height: "auto" }}>
                    <div className="h-full">
                      <Link
                        href={`/product-category/${category.slug}`}
                        className="flex flex-col h-full rounded-xl border border-gray-200 bg-white hover:border-teal-500 transition-colors"
                      >
                        <div className="h-36 flex items-center justify-center bg-gray-50 border-b border-gray-100 rounded-t-xl flex-shrink-0">
                          {categoryImage ? (
                            <Image
                              src={categoryImage}
                              alt={category.name}
                              width={120}
                              height={120}
                              className="object-contain max-h-full max-w-full"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">No Image</span>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex items-center justify-center min-h-[60px]">
                          <h3 className="text-sm font-semibold text-gray-900 text-center leading-tight line-clamp-2">
                            {category.name}
                          </h3>
                        </div>
                      </Link>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>
        )}
      </Container>
    </section>
  );
}

