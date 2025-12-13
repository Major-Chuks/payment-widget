/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile these packages so they're properly bundled
  transpilePackages: [
    "@base-org/account",
    "@safe-global/safe-apps-sdk",
    "@safe-global/safe-apps-provider",
  ],

  // Use SWC minifier instead of Terser (more stable)
  swcMinify: true,

  webpack: (config, { isServer }) => {
    // Handle optional/missing peer dependencies
    // These are wallet connectors you're not using
    config.resolve.alias = {
      ...config.resolve.alias,
      "@gemini-wallet/core": false,
      "@metamask/sdk": false,
      "porto/internal": false,
      porto: false,
      // axios: require.resolve("axios"),
      // zod: require.resolve("zod"),
    };

    // Server-side externals for Node.js specific packages
    if (isServer) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }

    // Client-side fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // 🛠 Tell Webpack to treat this Worker file as an ES module
    config.module.rules.push({
      test: /HeartbeatWorker\.js$/,
      type: "javascript/esm",
    });

    return config;
  },
};

module.exports = nextConfig;
