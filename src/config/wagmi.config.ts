/* eslint-disable @typescript-eslint/no-explicit-any */
// File: config/wagmi.config.ts
"use client";

import { http, createConfig } from "wagmi";
import { mainnet, polygon, arbitrum, optimism, base, bsc } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// Get your project ID from https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const connectors = [
  injected(),
  coinbaseWallet({
    appName: "Web3 Wallet Connection",
    appLogoUrl: "https://yourdomain.com/logo.png",
  }),
];

// Only add WalletConnect if we have a project ID
if (projectId) {
  connectors.push(
    walletConnect({
      projectId,
      metadata: {
        name: "Web3 Wallet Connection",
        description: "Connect your wallet to get started",
        url: "https://yourdomain.com",
        icons: ["https://yourdomain.com/icon.png"],
      },
      showQrModal: true,
    }) as unknown as any
  );
}

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism, base, bsc],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
  },
  ssr: false,
});
