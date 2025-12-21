import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for bundling with Tauri
  output: 'standalone',
  
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '/image/**',
      },
    ],
  },
  
  devIndicators: false,
};

export default nextConfig;
