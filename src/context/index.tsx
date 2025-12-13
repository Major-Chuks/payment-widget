"use client";

import React, { ReactNode } from "react";
import { AppKitNetwork } from "@reown/appkit/networks";
import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type Config, WagmiProvider, cookieToInitialState } from "wagmi";
import { networks, projectId, wagmiAdapter } from "@/config/wagmi.config";

const queryClient = new QueryClient();

if (!projectId) {
  throw new Error("Project ID is not defined");
}

const metadata = {
  name: "Orki-Money",
  description: "Swap",
  url: "https://orki-widget.vercel.app/",
  icons: ["https://orki-money.vercel.app/_next/static/media/logo.2ff79353.svg"],
};

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: networks as unknown as [AppKitNetwork, ...AppKitNetwork[]],
  defaultNetwork: networks[0] as unknown as AppKitNetwork,
  metadata,
  themeMode: "light",
});

function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

export default ContextProvider;
