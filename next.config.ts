import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Suppress warnings about params being Promises in Next.js 16
  experimental: {
    // This helps with async params handling
  },
};

export default nextConfig;
