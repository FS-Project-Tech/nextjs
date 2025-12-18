"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

export interface ShippingRate {
  id: string;
  label: string;
  description?: string;
  price: number;
  minimum_amount?: number;
  maximum_amount?: number;
}

export interface ShippingOptionsProps {
  selectedRateId?: string;
  onRateChange?: (rateId: string, rate: ShippingRate) => void;
  subtotal: number;
  items: any[];
}

export default function ShippingOptions({
  selectedRateId,
  onRateChange,
  subtotal,
  items,
}: ShippingOptionsProps) {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(undefined);
  const serializedItems = useMemo(() => JSON.stringify(items), [items]);

  const handleRateChange = useCallback(
    (rate: ShippingRate) => {
      if (selectedRateId === undefined) setInternalSelectedId(rate.id);
      onRateChange?.(rate.id, rate);
    },
    [selectedRateId, onRateChange]
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchRates() {
      try {
        // Mock API fetch
        const response: ShippingRate[] = await new Promise((resolve) =>
          setTimeout(
            () =>
              resolve([
                { id: "standard", label: "Standard", price: 10 },
                { id: "express", label: "Express", price: 20 },
              ]),
            500
          )
        );

        if (!cancelled) setRates(response);
      } catch (err) {
        console.error("Failed to fetch shipping rates:", err);
        if (!cancelled) setRates([]);
      }
    }

    fetchRates();
    return () => {
      cancelled = true;
    };
  }, [serializedItems]);

  const selectedId = selectedRateId ?? internalSelectedId;

  if (!rates.length) return <p>Loading shipping options...</p>;

  return (
    <div className="space-y-2">
      {rates.map((rate) => {
        const isDisabled =
          (rate.minimum_amount && subtotal < rate.minimum_amount) ||
          (rate.maximum_amount && subtotal > rate.maximum_amount);

        return (
          <label
            key={rate.id}
            className={`block p-3 border rounded cursor-pointer transition-colors ${
              selectedId === rate.id ? "border-blue-500 bg-blue-50" : "border-gray-300"
            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="shippingRate"
              value={rate.id}
              checked={selectedId === rate.id}
              disabled={isDisabled}
              onChange={() => handleRateChange(rate)}
              className="mr-2"
              aria-checked={selectedId === rate.id}
            />
            <span className="font-medium">{rate.label}</span>{" "}
            {rate.price > 0 && <span>(${rate.price.toFixed(2)})</span>}
            {rate.minimum_amount && (
              <span className="ml-2 text-sm text-gray-500">
                (Min ${rate.minimum_amount.toFixed(2)})
              </span>
            )}
            {rate.maximum_amount && (
              <span className="ml-2 text-sm text-gray-500">
                (Max ${rate.maximum_amount.toFixed(2)})
              </span>
            )}
            {rate.description && (
              <div className="text-sm text-gray-600">{rate.description}</div>
            )}
          </label>
        );
      })}
    </div>
  );
}
