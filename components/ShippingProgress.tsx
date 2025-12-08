"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/components/CartProvider";
import { useEffect, useState } from "react";
import { calculateSubtotal } from "@/lib/cart-utils";

const FREE_SHIPPING_THRESHOLD = 100; // $100 for free shipping

export default function ShippingProgress() {
  const { items } = useCart();
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(FREE_SHIPPING_THRESHOLD);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const total = calculateSubtotal(items);
    const remainingAmount = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
    const progressPercent = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);

    setProgress(progressPercent);
    setRemaining(remainingAmount);
    setIsVisible(total > 0 && total < FREE_SHIPPING_THRESHOLD);
  }, [items]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40"
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">
                {remaining > 0 ? (
                  <>You're ${remaining.toFixed(2)} away from free shipping!</>
                ) : (
                  <span className="text-emerald-600 font-semibold">🎉 Free shipping unlocked!</span>
                )}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Add ${remaining.toFixed(2)} more for free shipping
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

