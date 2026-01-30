import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is run in CI separately; skip during build to avoid
    // OOM on memory-constrained Vercel build machines.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
