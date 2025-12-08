"use client";

import { ReactNode } from 'react';

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  count?: number;
  children: ReactNode;
}

export default function FilterSection({
  title,
  isExpanded,
  onToggle,
  count = 0,
  children,
}: FilterSectionProps) {
  return (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 text-left hover:text-gray-900 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="font-medium text-gray-900 flex items-center gap-2">
          {title}
          {count > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </span>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="mt-2">{children}</div>}
    </div>
  );
}

