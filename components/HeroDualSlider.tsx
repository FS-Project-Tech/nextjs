"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Autoplay } from "swiper/modules";
import PrefetchLink from "@/components/PrefetchLink";
import { useMemo } from "react";

export interface SliderImage {
  src: string;
  alt?: string;
  link?: string;
}

const defaultLeft: SliderImage[] = [
  { src: "https://picsum.photos/1200/500?random=1", alt: "Placeholder 1" },
  { src: "https://picsum.photos/1200/500?random=2", alt: "Placeholder 2" },
  { src: "https://picsum.photos/1200/500?random=3", alt: "Placeholder 3" },
];

const defaultRight: SliderImage[] = [
  { src: "https://picsum.photos/600/500?random=11", alt: "Placeholder A" },
  { src: "https://picsum.photos/600/500?random=12", alt: "Placeholder B" },
  { src: "https://picsum.photos/600/500?random=13", alt: "Placeholder C" },
];

export default function HeroDualSlider({
  leftImages = [],
  rightImages = [],
}: {
  leftImages?: SliderImage[];
  rightImages?: SliderImage[];
}) {
  // Transform and validate images once
  const { leftData, rightData } = useMemo(() => {
    const validateImages = (images: any[]): SliderImage[] => {
      if (!Array.isArray(images)) return [];
      return images
        .map((img) => ({
          src: img?.src || img?.url || '',
          alt: img?.alt || '',
          link: img?.link || undefined,
        }))
        .filter((img) => img.src?.trim());
    };

    const validLeft = validateImages(leftImages);
    const validRight = validateImages(rightImages);

    return {
      leftData: validLeft.length ? validLeft : defaultLeft,
      rightData: validRight.length ? validRight : defaultRight,
    };
  }, [leftImages, rightImages]);

  const renderSlide = (img: SliderImage, index: number, sizes: string) => {
    const imageEl = (
      <div className="relative h-56 w-full sm:h-72 md:h-80 lg:h-96 overflow-hidden rounded-xl">
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
        {imageEl}
      </PrefetchLink>
    ) : imageEl;
  };

  return (
    <div className="mx-auto w-[85vw] px-4 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-3">
          <Swiper
            modules={[Pagination, Autoplay]}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            className="hero-slider-left"
          >
            {leftData.map((img, i) => (
              <SwiperSlide key={i}>
                {renderSlide(img, i, "(max-width: 768px) 100vw, 75vw")}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="md:col-span-1">
          <Swiper
            modules={[Pagination, Autoplay]}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            className="hero-slider-right"
          >
            {rightData.map((img, i) => (
              <SwiperSlide key={i}>
                {renderSlide(img, i, "(max-width: 768px) 100vw, 25vw")}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

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
        .swiper-pagination-bullet:hover {
          background: rgba(20, 184, 166, 0.8);
          border-color: rgb(20, 184, 166);
          transform: scale(1.2);
        }
        .swiper-pagination-bullet-active {
          background: rgb(20, 184, 166);
          border-color: rgb(20, 184, 166);
          width: 32px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(20, 184, 166, 0.6);
        }
      `}</style>
    </div>
  );
}