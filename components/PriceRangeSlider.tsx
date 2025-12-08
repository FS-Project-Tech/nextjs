"use client";

import { useState, useEffect, useCallback } from 'react';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onChange: (min: number, max: number) => void;
}

export default function PriceRangeSlider({
  min,
  max,
  minValue,
  maxValue,
  onChange,
}: PriceRangeSliderProps) {
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);

  useEffect(() => {
    setLocalMin(minValue);
    setLocalMax(maxValue);
  }, [minValue, maxValue]);

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMin = Math.min(Number(e.target.value), localMax - 1);
      setLocalMin(newMin);
      onChange(newMin, localMax);
    },
    [localMax, onChange]
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMax = Math.max(Number(e.target.value), localMin + 1);
      setLocalMax(newMax);
      onChange(localMin, newMax);
    },
    [localMin, onChange]
  );

  const minPercent = ((localMin - min) / (max - min)) * 100;
  const maxPercent = ((localMax - min) / (max - min)) * 100;

  return (
    <div className="py-4">
      <div className="relative h-2 bg-gray-200 rounded-lg">
        <div
          className="absolute h-2 bg-blue-600 rounded-lg"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />
      </div>
      <div className="flex items-center justify-between mt-4 gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Min</label>
          <input
            type="number"
            min={min}
            max={max}
            value={localMin}
            onChange={handleMinChange}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-gray-400 mt-6">-</span>
        <div className="flex-1">
          <label className="block text-xs text-gray-600 mb-1">Max</label>
          <input
            type="number"
            min={min}
            max={max}
            value={localMax}
            onChange={handleMaxChange}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">
        ${localMin.toFixed(2)} - ${localMax.toFixed(2)}
      </div>
    </div>
  );
}

