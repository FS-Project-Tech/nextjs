"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useEffect, useState } from "react";

const TABS = [
  { key: "home", label: "Home", href: "/", icon: (
    <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4H9v4a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-9z" />
  ) },
  { key: "categories", label: "Categories", href: "/shop", icon: (
    <>
      <path d="M4 4h7v7H4z" />
      <path d="M13 4h7v7h-7z" />
      <path d="M4 13h7v7H4z" />
      <path d="M13 13h7v7h-7z" />
    </>
  ) },
  { key: "search", label: "Search", href: "/shop?focus=search", icon: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ) },
  { key: "cart", label: "Cart", href: "#", icon: (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 12.39a2 2 0 0 0 2 1.61h7.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>
  ) },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { open, items } = useCart();
  const [visible, setVisible] = useState(true);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y < 10 || y < lastY);
      setLastY(y);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastY]);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 block md:hidden`} aria-label="Bottom navigation" suppressHydrationWarning>
      <div className={`mx-auto w-full bg-white/95 backdrop-blur border-t border-gray-200 transition-transform duration-200 ${visible ? "translate-y-0" : "translate-y-full"}`} suppressHydrationWarning>
        <ul className="grid grid-cols-4" suppressHydrationWarning>
          {TABS.map((tab) => {
            const active = tab.href !== "#" && pathname === tab.href;
            const content = (
              <div className={`flex flex-col items-center justify-center py-2 ${active ? "text-teal-700" : "text-gray-700"}`} suppressHydrationWarning>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {tab.icon}
                </svg>
                <span className="mt-0.5 text-[11px] leading-none">{tab.label}</span>
              </div>
            );

            if (tab.key === "cart") {
              return (
                <li key={tab.key} className="relative" suppressHydrationWarning>
                  <button type="button" onClick={() => open()} className="w-full">
                    {content}
                  </button>
                  {items.length > 0 && (
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-3 ml-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white" suppressHydrationWarning>
                      {items.length > 99 ? "99+" : items.length}
                    </span>
                  )}
                </li>
              );
            }

            return (
              <li key={tab.key} suppressHydrationWarning>
                <Link href={tab.href} className="block w-full">
                  {content}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
