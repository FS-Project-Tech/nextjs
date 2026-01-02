"use client";

import Link from "next/link";

interface MarketingUpdate {
  marketingImage?: {
    node?: {
      sourceUrl: string;
      altText?: string;
    };
  };
  marketingLink?: {
    url: string;
    title?: string;
    target?: string;
  };
}

export default function MarketingUpdatesClient({
  updates,
}: {
  updates: MarketingUpdate[];
}) {
  return (
    <section className="mb-10">
      <div className="mx-auto w-[85vw] px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Marketing & Updates
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Stay informed about our latest news and special offers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map((item, idx) => (
            <div
              key={idx}
              className="hover:shadow-lg transition"
            >
              {item.marketingImage?.node && item.marketingLink && (
                <Link
                  href={item.marketingLink.url}
                  target={item.marketingLink.target || "_self"}
                  className="block mb-4"
                >
                  <img
                    src={item.marketingImage.node.sourceUrl}
                    alt={item.marketingImage.node.altText || ""}
                    className="rounded-lg hover:opacity-90 transition"
                  />
                </Link>
              )}

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
