import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   experimental: {
    optimizeCss: false, //  disables lightningcss to avoid .node binary error
  },
};
module.exports = nextConfig;
export default nextConfig;
