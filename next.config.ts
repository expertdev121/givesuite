import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false, // ✅ disables lightningcss and fixes Vercel build error
  },
};

export default nextConfig;
