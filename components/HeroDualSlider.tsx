"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import PrefetchLink from "@/components/PrefetchLink";

import "swiper/css";
import "swiper/css/pagination";

export interface SliderImage {
  src: string;
  alt?: string;
  link?: string;
}

/* ---------------- FALLBACK IMAGES ---------------- */

const defaultLeft: SliderImage[] = [
  { src: "https://picsum.photos/1200/500?random=1", alt: "Placeholder 1" },
  { src: "https://picsum.photos/1200/500?random=2", alt: "Placeholder 2" },
  { src: "https://picsum.photos/1200/500?random=3", alt: "Placeholder 3" },
];

export default function HeroDualSlider({
  leftImages = [],
}: {
  leftImages?: SliderImage[];
}) {
  const leftData = leftImages.length ? leftImages : defaultLeft;

  const renderSlide = (
    img: SliderImage,
    index: number,
    sizes: string
  ) => {
    const image = (
      <div className="relative h-56 w-full overflow-hidden rounded-xl sm:h-72 md:h-80 lg:h-96">
        <Image
          src={img.src}
          alt={img.alt || `Slide ${index + 1}`}
          fill
          sizes={sizes}
          className="object-cover"
          priority={index === 0}
        />
      </div>
    );

    return img.link ? (
      <PrefetchLink href={img.link} critical>
        {image}
      </PrefetchLink>
    ) : (
      image
    );
  };

  return (
    <div className="container mx-auto">
      <div className="grid gap-4 grid-cols-1">

        {/* LEFT SLIDER */}
        <div className="md:col-span-3">
          <Swiper
            modules={[Pagination, Autoplay]}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            className="hero-slider-left"
          >
            {leftData.map((img, i) => (
              <SwiperSlide key={i}>
                {renderSlide(img, i, "(max-width:768px) 100vw, 75vw")}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

      </div>

      {/* Pagination styles */}
      <style jsx global>{`
        .hero-slider-left .swiper-pagination,
        .hero-slider-right .swiper-pagination {
          bottom: 20px !important;
        }

        .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          background: rgba(255, 255, 255, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
        }

        .swiper-pagination-bullet-active {
          width: 32px;
          border-radius: 6px;
          background: rgb(20, 184, 166);
          border-color: rgb(20, 184, 166);
          box-shadow: 0 2px 8px rgba(20, 184, 166, 0.6);
        }
      `}</style>
    </div>
  );
}