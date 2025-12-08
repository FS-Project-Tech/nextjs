"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  sku: string;
  variations: Array<{
    name: string;
    options: string[];
  }>;
}

interface ProductBookProps {
  products: Product[];
  categoryName: string;
}

export default function ProductBook({ products, categoryName }: ProductBookProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const productsPerPage = 15; // Products per single page
  const totalPages = Math.ceil(products.length / productsPerPage);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Navigate by 2 pages (left and right page spread)
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages - 2 && !isFlipping) {
      setDirection("right");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage((prev) => Math.min(prev + 2, totalPages - 2));
        setIsFlipping(false);
      }, 400);
    }
  }, [currentPage, totalPages, isFlipping]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 0 && !isFlipping) {
      setDirection("left");
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage((prev) => Math.max(prev - 2, 0));
        setIsFlipping(false);
      }, 400);
    }
  }, [currentPage, isFlipping]);

  const handleDownloadPDF = useCallback(async () => {
    if (typeof window === "undefined") return;

    try {
      // Try to dynamically import html2pdf.js
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const element = document.getElementById("product-book-content");
      if (!element) return;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${categoryName.replace(/\s+/g, "-")}-catalogue.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("PDF library not available, using print dialog:", error);
      // Fallback to print dialog - user can save as PDF from browser
      window.print();
    }
  }, [categoryName]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPreviousPage();
      } else if (e.key === "ArrowRight") {
        goToNextPage();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [goToPreviousPage, goToNextPage]);

  // Get products for left and right pages (2 pages visible at once)
  const leftPageProducts = products.slice(
    currentPage * productsPerPage,
    (currentPage + 1) * productsPerPage
  );
  const rightPageProducts = products.slice(
    (currentPage + 1) * productsPerPage,
    (currentPage + 2) * productsPerPage
  );
  const hasLeftPage = leftPageProducts.length > 0;
  const hasRightPage = rightPageProducts.length > 0;
  const displayTotalPages = Math.ceil(totalPages / 2); // Spreads (2 pages each)

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <p className="text-gray-500">No products available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] py-8" suppressHydrationWarning>
      <div className="relative w-full max-w-6xl" suppressHydrationWarning>
        {/* Book Container */}
        <div className="relative bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-2xl p-8 border-4 border-teal-200" suppressHydrationWarning>
          {/* Book Content */}
          <div id="product-book-content" className="bg-white rounded-lg shadow-lg p-8 min-h-[600px]" suppressHydrationWarning>
            {/* Book Header */}
            <div className="border-b-2 border-teal-300 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-teal-900">{categoryName}</h2>
              <p className="text-sm text-teal-700 mt-1">
                Spread {Math.floor(currentPage / 2) + 1} of {displayTotalPages} • Pages {currentPage + 1}-{Math.min(currentPage + 2, totalPages)} of {totalPages}
              </p>
            </div>

            {/* Two-Page Book Layout */}
            {isMounted ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{
                    rotateY: direction === "right" ? 90 : -90,
                    opacity: 0,
                  }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{
                    rotateY: direction === "right" ? -90 : 90,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.4 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                  suppressHydrationWarning
                >
                  {/* Left Page */}
                  <div className="bg-white border-r-2 border-teal-200 pr-4 min-h-[500px]" suppressHydrationWarning>
                    <div className="mb-4 pb-2 border-b border-teal-200" suppressHydrationWarning>
                      <h3 className="text-sm font-semibold text-teal-700">
                        Page {currentPage + 1}
                      </h3>
                    </div>
                    <div className="overflow-x-auto" suppressHydrationWarning>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-teal-50 border-b-2 border-teal-200">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                              SKU
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                              Name
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                              Variations
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-teal-900">
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {!hasLeftPage ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-8 text-center text-gray-400 text-xs"
                              >
                                No products
                              </td>
                            </tr>
                          ) : (
                            leftPageProducts.map((product, idx) => (
                              <tr
                                key={product.id}
                                className={`border-b border-gray-200 hover:bg-teal-50 transition-colors ${
                                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }`}
                              >
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  {product.sku || "-"}
                                </td>
                                <td className="px-3 py-2">
                                  <Link
                                    href={`/products/${product.slug}`}
                                    className="text-xs font-medium text-teal-900 hover:text-teal-700 transition-colors"
                                  >
                                    {product.name}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">
                                  {product.variations && product.variations.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {product.variations.slice(0, 1).map((variation, vIdx) => (
                                        <span
                                          key={vIdx}
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800"
                                        >
                                          {variation.name}: {variation.options.slice(0, 2).join(", ")}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {product.on_sale ? (
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs font-bold text-red-600">
                                        ${product.sale_price}
                                      </span>
                                      <span className="text-[10px] text-gray-500 line-through">
                                        ${product.regular_price}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-gray-900">
                                      ${product.price}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Page */}
                  <div className="bg-white pl-4 min-h-[500px]" suppressHydrationWarning>
                    <div className="mb-4 pb-2 border-b border-teal-200" suppressHydrationWarning>
                      <h3 className="text-sm font-semibold text-teal-700">
                        Page {currentPage + 2}
                      </h3>
                    </div>
                    <div className="overflow-x-auto" suppressHydrationWarning>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-teal-50 border-b-2 border-teal-200">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                              SKU
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                              Name
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                              Variations
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-teal-900">
                              Price
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {!hasRightPage ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-8 text-center text-gray-400 text-xs"
                              >
                                No products
                              </td>
                            </tr>
                          ) : (
                            rightPageProducts.map((product, idx) => (
                              <tr
                                key={product.id}
                                className={`border-b border-gray-200 hover:bg-teal-50 transition-colors ${
                                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }`}
                              >
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  {product.sku || "-"}
                                </td>
                                <td className="px-3 py-2">
                                  <Link
                                    href={`/products/${product.slug}`}
                                    className="text-xs font-medium text-teal-900 hover:text-teal-700 transition-colors"
                                  >
                                    {product.name}
                                  </Link>
                                </td>
                                <td className="px-3 py-2">
                                  {product.variations && product.variations.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {product.variations.slice(0, 1).map((variation, vIdx) => (
                                        <span
                                          key={vIdx}
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800"
                                        >
                                          {variation.name}: {variation.options.slice(0, 2).join(", ")}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {product.on_sale ? (
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs font-bold text-red-600">
                                        ${product.sale_price}
                                      </span>
                                      <span className="text-[10px] text-gray-500 line-through">
                                        ${product.regular_price}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-gray-900">
                                      ${product.price}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" suppressHydrationWarning>
                {/* Left Page */}
                <div className="bg-white border-r-2 border-teal-200 pr-4 min-h-[500px]" suppressHydrationWarning>
                  <div className="mb-4 pb-2 border-b border-teal-200" suppressHydrationWarning>
                    <h3 className="text-sm font-semibold text-teal-700">
                      Page {currentPage + 1}
                    </h3>
                  </div>
                  <div className="overflow-x-auto" suppressHydrationWarning>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-teal-50 border-b-2 border-teal-200">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                            Variations
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-teal-900">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {!hasLeftPage ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-8 text-center text-gray-400 text-xs"
                            >
                              No products
                            </td>
                          </tr>
                        ) : (
                          leftPageProducts.map((product, idx) => (
                            <tr
                              key={product.id}
                              className={`border-b border-gray-200 hover:bg-teal-50 transition-colors ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                            >
                              <td className="px-3 py-2 text-xs text-gray-700">
                                {product.sku || "-"}
                              </td>
                              <td className="px-3 py-2">
                                <Link
                                  href={`/products/${product.slug}`}
                                  className="text-xs font-medium text-teal-900 hover:text-teal-700 transition-colors"
                                >
                                  {product.name}
                                </Link>
                              </td>
                              <td className="px-3 py-2">
                                {product.variations && product.variations.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {product.variations.slice(0, 1).map((variation, vIdx) => (
                                      <span
                                        key={vIdx}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800"
                                      >
                                        {variation.name}: {variation.options.slice(0, 2).join(", ")}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {product.on_sale ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold text-red-600">
                                      ${product.sale_price}
                                    </span>
                                    <span className="text-[10px] text-gray-500 line-through">
                                      ${product.regular_price}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-gray-900">
                                    ${product.price}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Page */}
                <div className="bg-white pl-4 min-h-[500px]" suppressHydrationWarning>
                  <div className="mb-4 pb-2 border-b border-teal-200" suppressHydrationWarning>
                    <h3 className="text-sm font-semibold text-teal-700">
                      Page {currentPage + 2}
                    </h3>
                  </div>
                  <div className="overflow-x-auto" suppressHydrationWarning>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-teal-50 border-b-2 border-teal-200">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                            SKU
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-teal-900">
                            Variations
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-teal-900">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {!hasRightPage ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-8 text-center text-gray-400 text-xs"
                            >
                              No products
                            </td>
                          </tr>
                        ) : (
                          rightPageProducts.map((product, idx) => (
                            <tr
                              key={product.id}
                              className={`border-b border-gray-200 hover:bg-teal-50 transition-colors ${
                                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }`}
                            >
                              <td className="px-3 py-2 text-xs text-gray-700">
                                {product.sku || "-"}
                              </td>
                              <td className="px-3 py-2">
                                <Link
                                  href={`/products/${product.slug}`}
                                  className="text-xs font-medium text-teal-900 hover:text-teal-700 transition-colors"
                                >
                                  {product.name}
                                </Link>
                              </td>
                              <td className="px-3 py-2">
                                {product.variations && product.variations.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {product.variations.slice(0, 1).map((variation, vIdx) => (
                                      <span
                                        key={vIdx}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-teal-100 text-teal-800"
                                      >
                                        {variation.name}: {variation.options.slice(0, 2).join(", ")}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {product.on_sale ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs font-bold text-red-600">
                                      ${product.sale_price}
                                    </span>
                                    <span className="text-[10px] text-gray-500 line-through">
                                      ${product.regular_price}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-bold text-gray-900">
                                    ${product.price}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-4 mt-8">
        <button
          onClick={handleDownloadPDF}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download PDF
        </button>

        <button
          onClick={goToPreviousPage}
          disabled={currentPage === 0 || isFlipping}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Previous
        </button>

        <div className="text-sm text-gray-600">
          <span className="font-semibold">Spread {Math.floor(currentPage / 2) + 1}</span> / {displayTotalPages}
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - 2 || isFlipping}
          className="px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          Next
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Use arrow keys or buttons to navigate
      </p>
    </div>
  );
}
