import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Script from "next/script";
import Header from "@/components/Header";
import CartProvider from "@/components/CartProvider";
import ToastProvider from "@/components/ToastProvider";
import QueryProvider from "@/components/QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { CouponProvider } from "@/components/CouponProvider";
import CategoriesNav from "@/components/CategoriesNav";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import PWARegister from "@/components/PWARegister";
import AnalyticsInitializer from "@/components/AnalyticsInitializer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

// Validate environment variables at startup (server-side only)
if (typeof window === 'undefined') {
  try {
    const { validateStartup } = require('@/lib/startup-validation');
    validateStartup();
  } catch (error) {
    // In production, this will prevent startup
    // In development, it will log a warning
    console.error('Startup validation failed:', error);
  }
}

// Dynamically import MiniCartDrawer - only loaded when cart opens
// This reduces initial bundle size by ~100-150KB on every page
// Note: MiniCartDrawer is a client component, so it will hydrate on the client
const MiniCartDrawer = dynamic(() => import("@/components/MiniCartDrawer"), {
  // No ssr: false needed - component will render empty on server and hydrate on client
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "WooCommerce Headless Store",
    template: "%s | WooCommerce Store",
  },
  description: "A modern headless e-commerce solution with Next.js and WooCommerce. Shop the latest products with fast, secure checkout.",
  keywords: ["e-commerce", "woocommerce", "online store", "shopping", "headless commerce"],
  authors: [{ name: "WooCommerce Store" }],
  creator: "WooCommerce Store",
  publisher: "WooCommerce Store",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "WooCommerce Store",
    title: "WooCommerce Headless Store",
    description: "A modern headless e-commerce solution with Next.js and WooCommerce",
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "WooCommerce Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WooCommerce Headless Store",
    description: "A modern headless e-commerce solution with Next.js and WooCommerce",
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Add your verification codes here
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // yahoo: "your-yahoo-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        suppressHydrationWarning
        className="antialiased"
      >
        {/* Remove browser extension attributes before React hydrates */}
        <Script
          src="/remove-extension-attributes.js"
          strategy="beforeInteractive"
        />
        <AnalyticsInitializer />
        <ErrorBoundary>
          <QueryProvider>
            <ToastProvider>
              <AuthProvider>
                <WishlistProvider>
                  <CartProvider>
                    <CouponProvider>
                      {/* Unified Header Group - Header + Category Navigation */}
                      <div className="sticky top-0 z-50 bg-white shadow-sm">
                        <Header />
                        <CategoriesNav />
                      </div>
                      <main suppressHydrationWarning>
                        <div className="mx-auto w-full px-4 sm:px-6 md:w-[85vw] pb-16 md:pb-0" suppressHydrationWarning>
                          {children}
                        </div>
                      </main>
                      <Footer />
                      <MiniCartDrawer />
                      <BottomNav />
                      <PWARegister />
                    </CouponProvider>
                  </CartProvider>
                </WishlistProvider>
              </AuthProvider>
            </ToastProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
