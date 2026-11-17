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

/**
 * Sandbox runs on test networks. Its API names networks like mainnet ("base",
 * "ethereum", "polygon") but gives test-network token addresses, so the
 * checkout picks the test network itself. A checkout counts as sandbox when
 * its API address or its own domain contains "sandbox".
 */
export const IS_TESTNET =
  /sandbox/i.test(process.env.NEXT_PUBLIC_API_BASE_URL ?? "") ||
  (typeof window !== "undefined" &&
    /sandbox/i.test(window.location.hostname));

/** The test network used in place of each mainnet on sandbox. */
export const TESTNET_FOR: Record<string, AppKitNetwork> = {
  [String(base.id)]: baseSepolia,
  [String(polygon.id)]: polygonAmoy,
  [String(mainnet.id)]: sepolia,
};

// Only this environment's networks, so a sandbox payment can't reach mainnet
// (or the reverse). The first one is where wallets start.
const evmNetworks: AppKitNetwork[] = IS_TESTNET
  ? [baseSepolia, polygonAmoy, sepolia]
  : [base, polygon, mainnet];

// Solana stays on devnet in both environments, as before: the backend's
// Solana USDC is the devnet token on production too.
export const networks = [
  ...evmNetworks,
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
  networks: evmNetworks,
});

export const config = wagmiAdapter.wagmiConfig;

export const solanaWeb3JsAdapter = new SolanaAdapter();
