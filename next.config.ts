import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "pino",
    "thread-stream",
    "pino-pretty",
    "@walletconnect/universal-provider",
    "@walletconnect/ethereum-provider",
  ],

  // Turbopack configuration for Next.js 16+
  turbopack: {
    resolveAlias: {
      pino: "pino/browser.js",
    },
  },

  // Fallback webpack config (only used if --webpack flag is passed)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("pino", "thread-stream", "pino-pretty");
    }
    return config;
  },
};

export default nextConfig;
