"use client";

import { useEffect, useState, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import ProductCard from "@/components/ProductCard";
import { ProductCardProduct } from "@/lib/types/product";

interface ProductsSliderProps {
  products: ProductCardProduct[] | { products?: ProductCardProduct[] } | null | undefined;
  /** Variant: 'default' uses ProductsSlider settings, 'mini' uses MiniProductsSlider settings */
  variant?: 'default' | 'mini';
}

export default function ProductsSlider({ products: rawProducts, variant = 'default' }: ProductsSliderProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Normalize products to always be an array
  const products = useMemo(() => {
    if (!rawProducts) return [];
    if (Array.isArray(rawProducts)) return rawProducts;
    // Handle case where someone passes { products: [...] } object
    if (typeof rawProducts === 'object' && 'products' in rawProducts && Array.isArray(rawProducts.products)) {
      return rawProducts.products;
    }
    return [];
  }, [rawProducts]);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(max-width: 639px)');
      const update = () => setIsMobile(mq.matches);
      update();
      mq.addEventListener?.('change', update);
      return () => mq.removeEventListener?.('change', update);
    }
  }, []);

  // Early return if no products
  if (!products || products.length === 0) {
    return null;
  }

  // Helper function to render ProductCard
  const renderProductCard = (p: ProductCardProduct) => (
    <ProductCard
      id={p.id}
      slug={p.slug}
      name={p.name}
      sku={p.sku}
      price={p.price}
      sale_price={p.sale_price}
      regular_price={p.regular_price}
      on_sale={p.on_sale}
      tax_class={p.tax_class}
      tax_status={p.tax_status}
      average_rating={p.average_rating}
      rating_count={p.rating_count}
      imageUrl={p.images?.[0]?.src}
      imageAlt={p.images?.[0]?.alt || p.name}
    />
  );

  // SSR placeholder / Loading state
  if (!mounted) {
    const placeholderGridClass = variant === 'mini' 
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      : "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6";
    
    return (
      <div className="relative" suppressHydrationWarning>
        <div className={placeholderGridClass} suppressHydrationWarning>
          {products.slice(0, 6).map((p) => (
            <div key={p.id} className="h-full" suppressHydrationWarning>
              {renderProductCard(p)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Mobile: render static grid instead of Swiper
  if (isMobile) {
    const mobileGridClass = variant === 'mini'
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      : "grid grid-cols-2 gap-3";
    
    return (
      <div className={mobileGridClass} suppressHydrationWarning>
        {products.map((p) => (
          <div key={p.id} className="h-full" suppressHydrationWarning>
            {renderProductCard(p)}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Swiper carousel
  const swiperBreakpoints: Record<number, { slidesPerView: number; spaceBetween: number }> = variant === 'mini' 
    ? {
        640: { slidesPerView: 1, spaceBetween: 12 },
        768: { slidesPerView: 2, spaceBetween: 14 },
        1024: { slidesPerView: 5.5, spaceBetween: 16 },
        1280: { slidesPerView: 5.5, spaceBetween: 16 },
      }
    : {
        640: { slidesPerView: 1, spaceBetween: 14 },
        768: { slidesPerView: 2, spaceBetween: 16 },
        1024: { slidesPerView: 5.75, spaceBetween: 16 },
      };

  const initialSpaceBetween = variant === 'mini' ? 12 : 14;

  return (
    <div className="relative -mx-4 w-screen sm:mx-0 sm:w-auto" suppressHydrationWarning>
      <Swiper
        modules={[Navigation]}
        navigation
        className="!px-0"
        slidesPerView={1.75}
        spaceBetween={initialSpaceBetween}
        breakpoints={swiperBreakpoints}
      >
        {products.map((p) => (
          <SwiperSlide key={p.id} style={{ height: "100%" }}>
            <div className="h-full" suppressHydrationWarning>
              {renderProductCard(p)}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
