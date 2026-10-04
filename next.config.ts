import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage / any https image host used for vehicle photos
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
