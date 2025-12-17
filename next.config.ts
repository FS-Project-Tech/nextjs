import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

// Optionally include a domain from the WooCommerce API URL if provided
const wcApiUrl = process.env.NEXT_PUBLIC_WP_URL;
let wcHost: string | undefined;
try {
  if (wcApiUrl) {
    const u = new URL(wcApiUrl);
    wcHost = u.hostname;
  }
} catch {}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  // Disable ESLint during builds (optional - only if you want to skip linting)
  // @ts-expect-error - eslint.ignoreDuringBuilds exists at runtime in Next.js but not in TypeScript types
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript type checking during builds (NOT RECOMMENDED)
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  
  // Enable compression (gzip + Brotli)
  compress: true,
  
  // Use webpack instead of Turbopack (for compatibility with existing webpack config)
  // Add empty turbopack config to silence the warning
  turbopack: {},
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports - reduces bundle size and compile time
    optimizePackageImports: [
      'framer-motion',
      'axios',
      'swiper',
      '@tanstack/react-query',
      'react-hook-form',
      'lucide-react',
    ],
    // Enable faster refresh for better HMR experience
    // optimizeCss: true, // Uncomment if using CSS optimization
    // Turbopack persistent caching (available in Next.js 15.1+)
    // turbopackPersistentCaching: true, // Uncomment if using Next.js 15.1+
  },
  
  // Route-based prefetching configuration
  // Next.js automatically prefetches links when they enter the viewport
  // This configuration optimizes prefetch behavior
  // Note: Prefetch distance is controlled by Next.js internally (default: ~200px)
  // We can optimize by using prefetch={true} on critical paths
  
  // ISR (Incremental Static Regeneration) for SEO-friendly product/category pages
  // Pages will be statically generated and revalidated every 5 minutes
  // This ensures fast page loads while keeping content fresh
  
  // Optimize loading performance - reduces memory usage in dev
  // Prevents re-compiling on every click by keeping pages in memory longer
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 5 * 60 * 1000, // 5 minutes - keep pages longer to prevent re-compilation
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 10, // Increased to 10 for faster navigation and less re-compilation
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Webpack optimizations for faster builds (only when not using Turbopack)
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Optimize file watching on Windows - critical for Windows performance
      // Prevent re-compiling on every click by ignoring more files
      config.watchOptions = {
        poll: 1000, // Poll every 1s on Windows (better than default watch)
        aggregateTimeout: 500, // Increased to 500ms to batch changes
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/out/**',
          '**/dist/**',
          '**/.turbo/**',
          '**/coverage/**',
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/__tests__/**',
          '**/docs/**',
          '**/.env*.local',
        ],
        followSymlinks: false, // Don't follow symlinks (faster)
      };
      
      // Reduce memory usage by limiting chunk size
      if (!isServer) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              // Group vendor chunks for faster rebuilds
              framework: {
                name: 'framework',
                chunks: 'all',
                test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
                priority: 40,
                enforce: true,
              },
            },
          },
        };
      }
    }
    
    // Optimize module resolution
    config.resolve = {
      ...config.resolve,
      // Use symlinks for faster resolution
      symlinks: true,
      // Cache module resolution
      cache: dev,
    };
    
    return config;
  },
  images: {
    remotePatterns: [
      // Add known WooCommerce media hosts here
      {
        protocol: "https",
        hostname: "wordpress-1496507-5718895.cloudwaysapps.com",
        pathname: "/wp-content/uploads/**",
      },
      // Placeholder image host used in development/demo sliders
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      // Unsplash images for NDIS and other sections
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Optionally allow the host derived from NEXT_PUBLIC_WC_API_URL
      // (common when media is served from the same domain)
      ...(wcHost
        ? ([
            {
              protocol: "https",
              hostname: wcHost,
              pathname: "/wp-content/uploads/**",
            },
          ] as const)
        : ([] as const)),
      // Allow any WordPress/WooCommerce site (for flexibility)
      // Remove or restrict in production if needed
      ...(process.env.NODE_ENV === 'development' ? [
        {
          protocol: "https" as const,
          hostname: "**.wordpress.com",
        },
        {
          protocol: "https" as const,
          hostname: "**.wp.com",
        },
      ] : []),
    ],
    // Optimize images for better performance
    formats: ['image/avif', 'image/webp'],
    // Cache images longer (1 hour) to reduce upstream requests
    minimumCacheTTL: 3600,
    // Enable device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Increase timeout for slow upstream servers (30 seconds)
    // Note: This requires Next.js 14.1+ for full support
    unoptimized: false,
  },
  
  // Increase timeout for static page generation (for slow APIs)
  staticPageGenerationTimeout: 120,
  
  // Enable static page generation with ISR
  output: 'standalone',
};

export default withBundleAnalyzer(nextConfig);
