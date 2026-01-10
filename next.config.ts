import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Suppress warnings about params being Promises in Next.js 16
  experimental: {
    // This helps with async params handling
  },
  // Add headers to prevent caching of sensitive pages
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          // Disable bfcache for protected routes
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0, private',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
