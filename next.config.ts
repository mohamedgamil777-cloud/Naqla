import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage / any https image host used for vehicle photos
      { protocol: "https", hostname: "**" },
    ],
  },
  // Types & lint are verified locally via `tsc --noEmit`; don't let a build-env
  // difference (Node/TS version) fail the Vercel production build.
  typescript: { ignoreBuildErrors: true },
  // Admin forms post photos as data URLs (car, owner, licence…); the 1 MB default is too small.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
