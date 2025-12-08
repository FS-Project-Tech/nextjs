"use client";

import { useMemo } from "react";

interface VariationAttribute {
  name: string;
  options: string[];
}

interface Variation {
  id: number;
  price: string;
  regular_price?: string;
  on_sale?: boolean;
  attributes: Array<{ name: string; option: string }>;
  stock_status?: string;
}

interface VariationSwatchesProps {
  attributes: VariationAttribute[];
  variations: Variation[];
  selected?: { [name: string]: string };
  onChange: (selected: { [name: string]: string }) => void;
}

export default function VariationSwatches({
  attributes,
  variations,
  selected = {},
  onChange,
}: VariationSwatchesProps) {
  const handleAttributeChange = (attributeName: string, option: string) => {
    onChange({
      ...selected,
      [attributeName]: option,
    });
  };

  // Get available options for each attribute based on variations
  const getAvailableOptions = (attributeName: string) => {
    const allOptions = new Set<string>();
    variations.forEach((variation) => {
      const attr = variation.attributes.find((a) => a.name === attributeName);
      if (attr && variation.stock_status !== "outofstock") {
        allOptions.add(attr.option);
      }
    });
    return Array.from(allOptions);
  };

  return (
    <div className="space-y-4" suppressHydrationWarning>
      {attributes.map((attribute) => {
        const availableOptions = getAvailableOptions(attribute.name);
        const isSelected = (option: string) => selected[attribute.name] === option;
        
        return (
          <div key={attribute.name}>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {attribute.name}
            </label>
            <div className="flex flex-wrap gap-2">
              {availableOptions.length > 0 ? (
                availableOptions.map((option) => {
                  const selectedOption = isSelected(option);
                  
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAttributeChange(attribute.name, option)}
                      className={`rounded-md border px-4 py-2 text-sm font-medium transition-all ${
                        selectedOption
                          ? "border-black bg-black text-white"
                          : "border-black bg-transparent text-black hover:bg-gray-50"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No options available</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

