/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Fix WalletConnect dynamic import issues
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Add porto/internal to externals if not using it
    config.externals.push(
      "porto/internal",
      "porto",
      "@base-org/account",
      "@gemini-wallet/core",
      "@metamask/sdk",
      "@safe-global/safe-apps-sdk",
      "@safe-global/safe-apps-provider"
    );

    // 🛠 Tell Webpack to treat this Worker file as an ES module
    config.module.rules.push({
      test: /HeartbeatWorker\.js$/,
      type: "javascript/esm",
    });

    // ✅ Optional: Also help Terser (minifier) treat modules correctly
    if (config.optimization?.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.map(
        (plugin) => {
          if (plugin.constructor.name === "TerserPlugin") {
            return new plugin.constructor({
              ...plugin.options,
              terserOptions: {
                ...plugin.options.terserOptions,
                module: true,
              },
            });
          }
          return plugin;
        }
      );
    }

    return config;
  },
};

module.exports = nextConfig;
