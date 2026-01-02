"use client";

// components/ProductSectionWrapper.tsx

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

import AnimatedSection from "@/components/AnimatedSection";
import Container from "@/components/Container";
import ProductsSliderSkeleton from "@/components/skeletons/ProductsSliderSkeleton";
import { Product } from "@/lib/types/product";

// Client-only slider (Swiper safe)
const ProductsSlider = dynamic(
  () => import("@/components/ProductsSlider"),
  {
    ssr: false,
    loading: () => <ProductsSliderSkeleton />,
  }
);

interface ProductSectionWrapperProps {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  products: Product[];
  bgClassName?: string; // Add this
}

export default function ProductSectionWrapper({
  title,
  subtitle,
  viewAllHref,
  products,
  bgClassName, // Add this
}: ProductSectionWrapperProps) {
  return (
    <AnimatedSection>
      <section className="mb-16">
        <Container className="py-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
            className="mb-3 flex items-center justify-between"
          >
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>

            <Link
              href={viewAllHref}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all →
            </Link>
          </motion.div>

          {/* Subtitle */}
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-6 text-sm text-gray-600"
            >
              {subtitle}
            </motion.p>
          )}

          {/* Content */}
          {products.length === 0 ? (
            <div className="rounded-lg border bg-white p-8 text-center">
              <p className="mb-3 text-gray-600">
                No products available at the moment.
              </p>
              <Link
                href={viewAllHref}
                className="inline-block text-sm font-medium text-blue-600 hover:underline"
              >
                Browse all products →
              </Link>
            </div>
          ) : (
            <ProductsSlider products={products} />
          )}
        </Container>
      </section>
    </AnimatedSection>
  );
}
