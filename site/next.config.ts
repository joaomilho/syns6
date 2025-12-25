import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  // Explicitly skip Prisma validation
  experimental: {
    // This prevents Next.js from auto-detecting Prisma
  },
};

export default nextConfig;

