"use client";

import { motion } from "framer-motion";

interface ShippingProgressProps {
  subtotal: number;
  freeShippingThreshold?: number;
}

export default function ShippingProgress({
  subtotal,
  freeShippingThreshold = 100,
}: ShippingProgressProps) {
  const remaining = Math.max(freeShippingThreshold - subtotal, 0);
  const progress = Math.min((subtotal / freeShippingThreshold) * 100, 100);
  const isVisible = subtotal > 0 && subtotal < freeShippingThreshold;

  if (!isVisible) return null;

  return (
    <div className="my-4">
      <p className="text-sm font-medium text-gray-700">
        Add ${remaining.toFixed(2)} more to qualify for free shipping!
      </p>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-full h-2 bg-gray-200 rounded mt-1 overflow-hidden"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}