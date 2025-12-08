"use client";

import Link from "next/link";
import { useState } from "react";

interface Update {
  id: number;
  title: string;
  description: string;
  link?: string;
  linkText?: string;
  type?: "new" | "update" | "promotion" | "announcement";
}

// You can replace this with data from CMS/API later
const defaultUpdates: Update[] = [
  {
    id: 1,
    title: "New Product Launch",
    description: "Discover our latest collection of premium medical supplies, now available with exclusive early-bird pricing.",
    link: "/shop",
    linkText: "Shop Now",
    type: "new",
  },
  {
    id: 2,
    title: "System Updates",
    description: "We've improved our checkout process and added new payment options for a smoother shopping experience.",
    link: "/shop",
    linkText: "Learn More",
    type: "update",
  },
  {
    id: 3,
    title: "Special Promotion",
    description: "Limited time offer! Get 20% off on all bulk orders. Minimum purchase of $500 required.",
    link: "/shop",
    linkText: "Shop Now",
    type: "promotion",
  },
];

export default function MarketingUpdatesSection() {
  const [updates] = useState<Update[]>(defaultUpdates);

  if (updates.length === 0) {
    return null;
  }

  const getTypeStyles = (type?: string) => {
    switch (type) {
      case "new":
        return "bg-green-50 border-green-200 text-green-800";
      case "update":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "promotion":
        return "bg-amber-50 border-amber-200 text-amber-800";
      case "announcement":
        return "bg-purple-50 border-purple-200 text-purple-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case "new":
        return "New";
      case "update":
        return "Update";
      case "promotion":
        return "Promotion";
      case "announcement":
        return "Announcement";
      default:
        return "Info";
    }
  };

  return (
    <section className="mb-10">
      <div className="mx-auto w-[85vw] px-4 sm:px-6 lg:px-8" suppressHydrationWarning>
        <div className="mb-4" suppressHydrationWarning>
          <h2 className="text-2xl font-bold text-gray-900">Marketing & Updates</h2>
          <p className="text-sm text-gray-600 mt-1">Stay informed about our latest news and special offers</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" suppressHydrationWarning>
          {updates.map((update) => (
            <div
              key={update.id}
              className={`rounded-xl border-2 p-6 transition-all hover:shadow-lg ${getTypeStyles(update.type)}`}
              suppressHydrationWarning
            >
              <div className="flex items-start justify-between mb-3" suppressHydrationWarning>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/80">
                  {getTypeBadge(update.type)}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{update.title}</h3>
              <p className="text-sm mb-4 opacity-90">{update.description}</p>
              {update.link && (
                <Link
                  href={update.link}
                  className="inline-flex items-center text-sm font-medium hover:underline"
                >
                  {update.linkText || "Learn More"}
                  <svg
                    className="ml-1 w-4 h-4"
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
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

