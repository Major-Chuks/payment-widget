import {
  solanaDevnet,
  baseSepolia,
  polygon,
  mainnet,
} from "@reown/appkit/networks";
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
  nativeCurrency: string;
}

export const SUPPORTED_CHAINS = {
  evm: [
    {
      slug: "base",
      appKitNetwork: baseSepolia,
      nativeCurrency: "ETH",
    },
    {
      slug: "pol",
      appKitNetwork: polygon,
      nativeCurrency: "POL",
    },
    {
      slug: "eth",
      appKitNetwork: mainnet,
      nativeCurrency: "ETH",
    },
  ] as NetworkConfig[],

  solana: [
    {
      slug: "solana",
      appKitNetwork: solanaDevnet,
      nativeCurrency: "SOL",
    },
  ] as NetworkConfig[],
};

export const networks = [
  ...SUPPORTED_CHAINS.evm.map((n) => n.appKitNetwork),
  ...SUPPORTED_CHAINS.solana.map((n) => n.appKitNetwork),
] as [AppKitNetwork, ...AppKitNetwork[]];

export const evmNetworkSlugs = SUPPORTED_CHAINS.evm.map((n) => n.slug);
export const solanaNetworkSlugs = SUPPORTED_CHAINS.solana.map((n) => n.slug);

export function getNativeCurrencyByChainId(
  chainId: number,
): string | undefined {
  return SUPPORTED_CHAINS.evm.find((c) => c.appKitNetwork.id === chainId)
    ?.nativeCurrency;
}

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks: [baseSepolia, polygon, mainnet],
});

export const config = wagmiAdapter.wagmiConfig;

export const solanaWeb3JsAdapter = new SolanaAdapter();
