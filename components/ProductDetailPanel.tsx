"use client";

import type { WooCommerceProduct, WooCommerceVariation } from "@/lib/woocommerce";
import { useMemo, useState, useEffect } from "react";
import ProductVariations from "@/components/ProductVariations";
import RecurringSelect, { RecurringPlan } from "@/components/RecurringSelect";
import ServiceFeatures from "@/components/ServiceFeatures";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";
import { WishlistButton } from "@/components/WishlistButton";
import { formatPriceWithLabel } from "@/lib/format-utils";
import { matchVariation, findBrand, isAllSelected, extractProductBrands } from "@/lib/utils/product";
import { useViewedProduct } from "@/hooks/useViewedProducts";
import ConsultationFormModal from "@/components/ConsultationFormModal";

export default function ProductDetailPanel({ product, variations }: { product: WooCommerceProduct; variations: WooCommerceVariation[] }) {
	const [plan, setPlan] = useState<RecurringPlan>("none");
	const [selected, setSelected] = useState<{ [name: string]: string }>({});
	const [currentSku, setCurrentSku] = useState<string | null>(product.sku || null);
	const [matchedVariation, setMatchedVariation] = useState<WooCommerceVariation | null>(null);
	const matched = useMemo(() => matchVariation(variations, selected), [variations, selected]);

// variable attribute definitions for swatches
const attributes = useMemo(() => {
    return (product.attributes || [])
        .filter((a: any) => (a?.variation ?? false) && Array.isArray(a.options))
        .map((a: any) => ({ name: a.name as string, options: a.options as string[] }));
}, [product.attributes]);

	const brandList = useMemo(() => extractProductBrands(product), [product]);
	const brand = brandList.length > 0 ? brandList.map((b) => b.name).filter(Boolean).join(", ") : findBrand(product);

	// Check if product has resources (downloads or meta_data with resource)
	const hasResources = useMemo(() => {
		// Check downloads array
		if (product.downloads && Array.isArray(product.downloads) && product.downloads.length > 0) {
			return true;
		}
		// Check meta_data for resource fields
		if (product.meta_data && Array.isArray(product.meta_data)) {
			const resourceKeys = ['resource', 'resources', 'resource_url', 'resource_file', 'download_resource'];
			return product.meta_data.some((meta: any) => {
				const key = String(meta.key || '').toLowerCase();
				return resourceKeys.some(rk => key.includes(rk)) && meta.value;
			});
		}
		return false;
	}, [product.downloads, product.meta_data]);

	const displayPrice = matchedVariation?.price || matched?.price || product.price;
	const displayRegular = matchedVariation?.regular_price || matched?.regular_price || product.regular_price;
	const onSale = matchedVariation ? matchedVariation.on_sale : (matched ? matched.on_sale : product.on_sale);
    const { addItem, open: openCart } = useCart();
    const { success, error: showError } = useToast();
	const [quantity, setQuantity] = useState<number>(1);
	const [addingToCart, setAddingToCart] = useState(false);
	const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);

	// Track viewed product
	const categoryIds = (product.categories || []).map((c) => c.id);
	useViewedProduct(product.id, categoryIds);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
				<div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
					{currentSku || product.sku ? (
						<span>SKU: {currentSku || product.sku}</span>
					) : null}
					{brand && <span>Brand: {brand}</span>}
					{product.categories && product.categories.length > 0 && (
						<span>Category: {product.categories.map((c) => c.name).join(", ")}</span>
					)}
				</div>
			</div>

			<div className="flex items-center gap-4">
				{/* GST-aware pricing */}
				<div className="text-gray-900">
					{(() => {
						const raw = Number(displayPrice || 0);
						if (isNaN(raw) || raw <= 0) {
							return <span className="text-2xl font-semibold text-[#1f605f]">${displayPrice}</span>;
						}

						const taxClass = matchedVariation?.tax_class || matched?.tax_class || product.tax_class;
						const taxStatus = matchedVariation?.tax_status || matched?.tax_status || product.tax_status;
						const priceInfo = formatPriceWithLabel(raw, taxClass, taxStatus);

						if (priceInfo.taxType === "gst_free") {
							return (
								<div className="space-y-1">
									<div className="text-2xl font-semibold text-[#1f605f]">
										{priceInfo.label}: {priceInfo.price}
									</div>
									<div className="text-[11px] inline-flex items-center rounded bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
										GST FREE
									</div>
								</div>
							);
						}

						return (
							<div className="space-y-0.5">
								<div className="text-2xl font-semibold text-[#1f605f]">
									{priceInfo.label}: {priceInfo.price}
								</div>
								{priceInfo.exclPrice ? (
									<div className="text-sm text-[#1f605f]">Excl. GST: {priceInfo.exclPrice}</div>
								) : null}
							</div>
						);
					})()}
				</div>
				{/* Regular price and sale badge */}
				<div className="flex items-center gap-3">
					{displayRegular && displayRegular !== displayPrice && (
						<span className="text-lg text-gray-500 line-through">${displayRegular}</span>
					)}
					{onSale && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Sale</span>}
				</div>
			</div>

			{/* Variations as swatches (inline) */}
            {attributes.length > 0 && (
				<ProductVariations
					attributes={attributes}
					variations={variations}
					onVariationChange={(variation, selectedAttributes) => {
						setMatchedVariation(variation);
						setSelected(selectedAttributes);
						// Reset SKU to product SKU if no variation matched
						if (!variation) {
							setCurrentSku(product.sku || null);
						}
					}}
					onSkuChange={(sku) => {
						setCurrentSku(sku || product.sku || null);
					}}
					style="swatches"
				/>
			)}

			<RecurringSelect onChange={setPlan} value={plan} />

            {/* Quantity */}
            <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Quantity</label>
                <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-24 rounded border px-3 py-2"
                />
            </div>

            {/* Resource Button */}
            {hasResources && (
                <div className="pt-2">
                    <button
                        onClick={() => {
                            // Open resources - check if downloads exist or get from meta_data
                            if (product.downloads && product.downloads.length > 0) {
                                // Open first download or show list
                                const firstDownload = product.downloads[0];
                                if (firstDownload.file) {
                                    window.open(firstDownload.file, '_blank');
                                }
                            } else if (product.meta_data) {
                                // Find resource URL from meta_data
                                const resourceMeta = product.meta_data.find((meta: any) => {
                                    const key = String(meta.key || '').toLowerCase();
                                    return ['resource', 'resource_url', 'resource_file'].some(rk => key.includes(rk)) && meta.value;
                                });
                                if (resourceMeta?.value) {
                                    window.open(resourceMeta.value, '_blank');
                                }
                            }
                        }}
                        className="block w-full text-center rounded-md border-2 border-blue-600 bg-transparent px-4 py-3 text-sm font-medium text-blue-600 transition hover:bg-blue-600 hover:text-white"
                    >
                        Resource
                    </button>
                </div>
            )}

            <div className="pt-2 flex items-center gap-3">
				<button
					onClick={async () => {
						if (addingToCart) return;
						if (attributes.length > 0 && !isAllSelected(selected, attributes)) return;

						setAddingToCart(true);
						try {
							// Simulate API call delay (replace with actual cart API call if needed)
							await new Promise(resolve => setTimeout(resolve, 500));

							const variationId = matchedVariation?.id || matched?.id;
							const variationTaxClass = matchedVariation?.tax_class || matched?.tax_class || product.tax_class || undefined;
							const variationTaxStatus = matchedVariation?.tax_status || matched?.tax_status || product.tax_status || undefined;
							addItem({
								productId: product.id,
								variationId,
								name: product.name,
								slug: product.slug,
								imageUrl: product.images?.[0]?.src,
								price: (matchedVariation?.price || matched?.price || product.price) || "0",
								qty: quantity,
								sku: matchedVariation?.sku || matched?.sku || product.sku || undefined,
								attributes: selected,
								deliveryPlan: plan,
								tax_class: variationTaxClass,
								tax_status: variationTaxStatus,
							});

							// Open mini cart drawer
							openCart();
							
							// Show success toast
							success("Product added to cart");
						} catch (error) {
							console.error('Error adding to cart:', error);
						} finally {
							setAddingToCart(false);
						}
					}}
                    disabled={attributes.length > 0 && !isAllSelected(selected, attributes) || addingToCart}
                    className="btn-brand flex-1 rounded-md px-4 py-3 text-white transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{addingToCart ? (
						<>
							<svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span>Adding...</span>
						</>
					) : (
						<span>Add to Cart</span>
					)}
				</button>
                
                <WishlistButton 
                  productId={product.id} 
                  size="lg" 
                  variant="icon"
                  className="!h-12 !w-12"
                />
            </div>
            {attributes.length > 0 && !isAllSelected(selected, attributes) && (
                <p className="text-sm text-red-600">Please select all variations before adding to cart.</p>
            )}

            {/* Need Consultation Link */}
            <div className="pt-2">
                <button
                    onClick={() => setIsConsultationModalOpen(true)}
                    className="flex items-center gap-2 text-sm text-[#1f605f] hover:text-[#1a4d4c] transition-colors underline"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span>Need Consultation</span>
                </button>
            </div>

			{/* Service Features Section */}
			<div className="pt-6 border-t border-gray-200">
				<ServiceFeatures />
			</div>

			{/* Consultation Form Modal */}
			<ConsultationFormModal
				isOpen={isConsultationModalOpen}
				onClose={() => setIsConsultationModalOpen(false)}
				productName={product.name}
			/>
		</div>
	);
}
