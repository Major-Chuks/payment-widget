import { solanaDevnet, baseSepolia } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId) {
  throw new Error("Project ID is not defined");
}

export interface NetworkConfig {
  slug: string;
  appKitNetwork: AppKitNetwork;
}

export const SUPPORTED_CHAINS = {
  evm: [{ slug: "base", appKitNetwork: baseSepolia }] as NetworkConfig[],

  solana: [{ slug: "solana", appKitNetwork: solanaDevnet }] as NetworkConfig[],
};

export const networks = [
  ...SUPPORTED_CHAINS.evm.map((n) => n.appKitNetwork),
  ...SUPPORTED_CHAINS.solana.map((n) => n.appKitNetwork),
] as [AppKitNetwork, ...AppKitNetwork[]];

export const evmNetworkSlugs = SUPPORTED_CHAINS.evm.map((n) => n.slug);
export const solanaNetworkSlugs = SUPPORTED_CHAINS.solana.map((n) => n.slug);

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks: [baseSepolia],
});

export const config = wagmiAdapter.wagmiConfig;

export const solanaWeb3JsAdapter = new SolanaAdapter();
