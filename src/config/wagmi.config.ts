// File: config/wagmi.config.ts
import { http, createConfig } from "wagmi";
import { mainnet, polygon, arbitrum, optimism, base, bsc } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// Get your project ID from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism, base, bsc],
  connectors: [
    // injected({
    //   target: "metaMask",
    // }),
    injected(),
    coinbaseWallet({
      appName: "Web3 Wallet Connection",
      appLogoUrl: "https://yourdomain.com/logo.png",
    }),
    walletConnect({
      projectId,
      metadata: {
        name: "Web3 Wallet Connection",
        description: "Connect your wallet to get started",
        url:
          typeof window !== "undefined"
            ? window.location.origin
            : "https://yourdomain.com",
        icons: ["https://yourdomain.com/icon.png"],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
  },
  ssr: true,
});
