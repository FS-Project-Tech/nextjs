"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useState, useCallback, useMemo, type MouseEvent } from "react";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";
import { WishlistButton } from "@/components/WishlistButton";
import { formatPriceWithLabel } from "@/lib/format-utils";

// ============================================================================
// Types
// ============================================================================

export interface ProductCardProps {
  id: number;
  slug: string;
  name: string;
  sku?: string | null;
  price: string;
  sale_price?: string;
  regular_price?: string;
  on_sale?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  tax_class?: string;
  tax_status?: string;
  average_rating?: string;
  rating_count?: number;
  /** Priority loading for above-the-fold cards */
  priority?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

interface PriceData {
  regular: number;
  current: number;
  isOnSale: boolean;
  discount: number;
  savings: string;
  formattedRegular: string;
  formattedCurrent: string;
  label: string;
  exclPrice: string | null;
  isGstFree: boolean;
}

interface RatingData {
  avg: number;
  count: number;
}

// ============================================================================
// Constants
// ============================================================================

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23f3f4f6' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='system-ui' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

// SVG paths as constants to avoid recreation
const CART_ICON_PATH = "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 6h12.2M7 13L5 5m2 14a1 1 0 110-2 1 1 0 010 2zm9 0a1 1 0 110-2 1 1 0 010 2z";
const STAR_ICON_PATH = "M10 15l-5.878 3.09 1.123-6.545L.49 6.91l6.564-.954L10 0l2.946 5.956 6.564.954-4.755 4.635 1.123 6.545z";

// ============================================================================
// Helper Functions (outside component to avoid recreation)
// ============================================================================

function calculatePriceData(
  price: string,
  salePrice?: string,
  regularPrice?: string,
  onSale?: boolean,
  taxClass?: string,
  taxStatus?: string
): PriceData {
  const regular = parseFloat(regularPrice || "0") || 0;
  const sale = parseFloat(salePrice || price || "0") || 0;
  const current = sale || 0;
  const isOnSale = Boolean(onSale && regular > 0 && sale > 0 && sale < regular);
  const discount = isOnSale ? Math.round(((regular - sale) / regular) * 100) : 0;
  const savingsAmount = isOnSale ? regular - sale : 0;
  const savings = savingsAmount > 0 ? `$${savingsAmount.toFixed(2)}` : "";

  let formattedPrice = "$0.00";
  let label = "Price";
  let exclPrice: string | null = null;
  let isGstFree = false;
  
  if (current > 0) {
    try {
      const priceInfo = formatPriceWithLabel(current, taxClass, taxStatus);
      formattedPrice = priceInfo.price;
      label = priceInfo.label || "Price";
      exclPrice = priceInfo.exclPrice || null;
      isGstFree = priceInfo.taxType === "gst_free";
    } catch {
      formattedPrice = `$${current.toFixed(2)}`;
    }
  }

  return {
    regular,
    current,
    isOnSale,
    discount,
    savings,
    formattedRegular: `$${regular.toFixed(2)}`,
    formattedCurrent: formattedPrice,
    label,
    exclPrice,
    isGstFree,
  };
}

function calculateRatingData(ratingCount?: number, averageRating?: string): RatingData | null {
  const count = Number(ratingCount || 0);
  if (count <= 0) return null;
  
  const avg = parseFloat(averageRating || "0") || 0;
  const clampedAvg = Math.max(0, Math.min(5, avg));
  
  return isNaN(clampedAvg) ? null : { avg: Math.round(clampedAvg), count };
}

// ============================================================================
// Sub-components (memoized for performance)
// ============================================================================

const StarRating = memo(function StarRating({ rating }: { rating: RatingData }) {
  return (
    <div className="mt-2 flex items-center gap-1" role="img" aria-label={`Rated ${rating.avg} out of 5 stars`}>
      <div className="flex gap-0.5 text-amber-400">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg
            key={i}
            className={`h-4 w-4 ${i < rating.avg ? "fill-current" : "fill-gray-200"}`}
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d={STAR_ICON_PATH} />
          </svg>
        ))}
      </div>
      <span className="text-xs text-gray-600">({rating.count})</span>
    </div>
  );
});

const DiscountBadge = memo(function DiscountBadge({ discount }: { discount: number }) {
  return (
    <span
      className="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm"
      aria-label={`${discount}% off`}
    >
      -{discount}%
    </span>
  );
});

const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
});

// ============================================================================
// Main Component
// ============================================================================

function ProductCardComponent({
  id,
  slug,
  name,
  sku,
  price,
  sale_price,
  regular_price,
  on_sale,
  imageUrl,
  imageAlt,
  tax_class,
  tax_status,
  average_rating,
  rating_count,
  priority = false,
  compact = false,
}: ProductCardProps) {
  // Hooks
  const { addItem, open: openCart } = useCart();
  const { success, error: showError } = useToast();

  // Local state
  const [addingToCart, setAddingToCart] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Memoized calculations
  const priceData = useMemo(
    () => calculatePriceData(price, sale_price, regular_price, on_sale, tax_class, tax_status),
    [price, sale_price, regular_price, on_sale, tax_class, tax_status]
  );

  const ratingData = useMemo(
    () => calculateRatingData(rating_count, average_rating),
    [rating_count, average_rating]
  );

  const productUrl = useMemo(() => `/products/${slug}`, [slug]);

  // Stable image source
  const imageSrc = useMemo(() => {
    if (imageError || !imageUrl) return PLACEHOLDER_IMAGE;
    return imageUrl;
  }, [imageUrl, imageError]);

  // Event handlers (useCallback for stable references)
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleAddToCart = useCallback(async () => {
    if (addingToCart) return;

    setAddingToCart(true);
    try {
      addItem({
        productId: id,
        name,
        slug,
        imageUrl: imageUrl || undefined,
        price: sale_price || price || "0",
        qty: 1,
        sku: sku || undefined,
        tax_class: tax_class || undefined,
        tax_status: tax_status || undefined,
      });

      openCart();
      success("Added to cart");
    } catch (err) {
      console.error("Cart error:", err);
      showError("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  }, [id, name, slug, imageUrl, price, sale_price, sku, tax_class, tax_status, addingToCart, addItem, openCart, success, showError]);

  // Render
  return (
    <article
      className="group relative flex h-[525px] flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
      style={{ contain: "layout style paint" }}
    >
      {/* Image Section */}
      <Link
        href={productUrl}
        className="block overflow-hidden rounded-t-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        aria-label={`View ${name}`}
        prefetch={false}
      >
        <div className={`relative bg-gray-100 ${compact ? "aspect-[4/3]" : "aspect-square"}`}>
          <Image
            src={imageSrc}
            alt={imageAlt || name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 will-change-transform group-hover:scale-105"
            loading={priority ? "eager" : "lazy"}
            priority={priority}
            onError={handleImageError}
            quality={75}
          />
          {priceData.isOnSale && <DiscountBadge discount={priceData.discount} />}
        </div>
      </Link>

      {/* Content Section */}
      <div className={`flex flex-1 flex-col gap-2 ${compact ? "p-3" : "p-4"}`}>
        {/* Product Info */}
        <div className="min-h-0 flex-1">
          <Link
            href={productUrl}
            className={`block font-medium text-gray-900 line-clamp-2 min-h-[3.75rem] transition-colors hover:text-teal-700 focus-visible:outline-none focus-visible:underline ${
              compact ? "text-sm" : "text-sm md:text-base"
            }`}
            prefetch={false}
          >
            {name}
          </Link>

          <p className="mt-1 min-h-[1rem] text-xs text-gray-500 truncate">
            {sku ? `SKU: ${sku}` : "\u00A0"}
          </p>


          <div className="min-h-[1.25rem]">
            {ratingData && <StarRating rating={ratingData} />}
          </div>

        </div>

        {/* Pricing */}
        <div className="space-y-1 min-h-[3.5rem]">
          {priceData.isOnSale && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 line-through">{priceData.formattedRegular}</p>
              <span className="text-xs font-semibold text-green-600">
                Save {priceData.savings}
              </span>
            </div>
          )}

          <div className={priceData.isGstFree ? "text-emerald-700" : undefined}>
            <p className={`font-bold ${compact ? "text-base" : "text-base md:text-lg"}`}>
              {priceData.label}: {priceData.formattedCurrent}
            </p>

            {priceData.exclPrice && (
              <p className="text-xs text-gray-600">Excl. GST: {priceData.exclPrice}</p>
            )}
          </div>

          {priceData.isOnSale && (
            <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              Sale
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={addingToCart}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Add ${name} to cart`}
            aria-busy={addingToCart}
          >
            {addingToCart ? (
              <>
                <LoadingSpinner />
                <span className="sr-only sm:not-sr-only">Adding…</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={CART_ICON_PATH} />
                </svg>
                <span className="sr-only sm:not-sr-only">Add to cart</span>
              </>
            )}
          </button>
          
          <WishlistButton productId={id} size="md" variant="icon" />
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// Export with memo + custom comparison
// ============================================================================

function propsAreEqual(prev: ProductCardProps, next: ProductCardProps): boolean {
  // Compare only props that affect rendering
  return (
    prev.id === next.id &&
    prev.slug === next.slug &&
    prev.name === next.name &&
    prev.sku === next.sku &&
    prev.price === next.price &&
    prev.sale_price === next.sale_price &&
    prev.regular_price === next.regular_price &&
    prev.on_sale === next.on_sale &&
    prev.imageUrl === next.imageUrl &&
    prev.tax_class === next.tax_class &&
    prev.tax_status === next.tax_status &&
    prev.average_rating === next.average_rating &&
    prev.rating_count === next.rating_count &&
    prev.priority === next.priority &&
    prev.compact === next.compact
  );
}

const ProductCard = memo(ProductCardComponent, propsAreEqual);

export default ProductCard;
