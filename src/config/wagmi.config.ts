import { cookieStorage, createStorage } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import * as allNetworks from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId) {
  throw new Error("Project ID is not defined");
}

// ✅ Type guard: checks if a value is an AppKitNetwork
function isAppKitNetwork(value: unknown): value is allNetworks.AppKitNetwork {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "nativeCurrency" in value &&
    typeof (value as any).nativeCurrency?.symbol === "string"
  );
}

// ✅ Filter allNetworks values that are AppKitNetwork
const _networks = Object.values(allNetworks).filter(isAppKitNetwork);

export const networks = [
  (_networks as AppKitNetwork[]).find((n) => n.id === 1)!, // mainnet
  ...(_networks as AppKitNetwork[]).filter((n) => n.id !== 1),
];

// ✅ Create Wagmi Adapter config
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks: networks as unknown as AppKitNetwork[],
});

export const config = wagmiAdapter.wagmiConfig;
