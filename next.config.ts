import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    // Type checking is run in CI separately; skip during build to avoid
    // OOM on memory-constrained Vercel build machines.
    ignoreBuildErrors: true,
  },
  turbopack: {
    resolveAlias: {
      tailwindcss: path.resolve(process.cwd(), "node_modules/tailwindcss"),
    },
  },
};

export default nextConfig;
