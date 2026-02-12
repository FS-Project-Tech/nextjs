"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps page content: uses container for most routes, full width for /ndis
 * so the NDIS hero and footer can span edge-to-edge without breakout tricks.
 */
export default function MainContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isNdis = pathname === "/ndis";

  if (isNdis) {
    return <>{children}</>;
  }
  return <div className="container mx-auto">{children}</div>;
}
