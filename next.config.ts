import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "pino",
    "thread-stream",
    "pino-pretty",
    "@walletconnect/universal-provider",
    "@walletconnect/ethereum-provider",
    "idb-keyval",
    "unstorage",
  ],

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        "pino",
        "thread-stream",
        "pino-pretty",
        "@walletconnect/universal-provider",
        "@walletconnect/ethereum-provider",
        "idb-keyval",
        "unstorage"
      );
    }
    return config;
  },
};

export default nextConfig;
