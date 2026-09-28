import {
  solanaDevnet,
  base,
  baseSepolia,
  polygon,
  polygonAmoy,
  mainnet,
  sepolia,
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
  aliases?: string[];
  appKitNetwork: AppKitNetwork;
  nativeCurrency: string;
}

export const SUPPORTED_CHAINS = {
  evm: [
    {
      slug: "base",
      appKitNetwork: base,
      nativeCurrency: "ETH",
    },
    {
      slug: "base-sepolia",
      appKitNetwork: baseSepolia,
      nativeCurrency: "ETH",
    },
    {
      slug: "pol",
      aliases: ["polygon"],
      appKitNetwork: polygon,
      nativeCurrency: "POL",
    },
    {
      slug: "polygon-amoy",
      aliases: ["amoy", "pol-amoy"],
      appKitNetwork: polygonAmoy,
      nativeCurrency: "POL",
    },
    {
      slug: "eth",
      aliases: ["ethereum", "mainnet"],
      appKitNetwork: mainnet,
      nativeCurrency: "ETH",
    },
    {
      slug: "eth-sepolia",
      aliases: ["sepolia", "ethereum-sepolia"],
      appKitNetwork: sepolia,
      nativeCurrency: "ETH",
    },
  ] as NetworkConfig[],

  solana: [
    {
      slug: "solana",
      aliases: ["solana-devnet"],
      appKitNetwork: solanaDevnet,
      nativeCurrency: "SOL",
    },
  ] as NetworkConfig[],
};

export const networks = [
  ...SUPPORTED_CHAINS.evm.map((n) => n.appKitNetwork),
  ...SUPPORTED_CHAINS.solana.map((n) => n.appKitNetwork),
] as [AppKitNetwork, ...AppKitNetwork[]];

export const evmNetworkSlugs = SUPPORTED_CHAINS.evm.flatMap((n) => [
  n.slug,
  ...(n.aliases ?? []),
]);
export const solanaNetworkSlugs = SUPPORTED_CHAINS.solana.flatMap((n) => [
  n.slug,
  ...(n.aliases ?? []),
]);

export function getNativeCurrencyByChainId(
  chainId: number,
): string | undefined {
  return SUPPORTED_CHAINS.evm.find((c) => c.appKitNetwork.id === chainId)
    ?.nativeCurrency;
}

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  projectId,
  networks: [base, baseSepolia, polygon, polygonAmoy, mainnet, sepolia],
});

export const config = wagmiAdapter.wagmiConfig;

export const solanaWeb3JsAdapter = new SolanaAdapter();
