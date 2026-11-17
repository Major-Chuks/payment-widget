'use client'

import { solanaWeb3JsAdapter, projectId, networks, wagmiAdapter } from '@/config'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Set up queryClient
const queryClient = new QueryClient()

// What wallets show when the customer is asked to connect. `url` must be the
// checkout's own origin (sandbox or production), or wallets warn that the
// request comes from a different site. The server render has no window, so it
// falls back to production; the browser always uses its real origin.
const origin =
  typeof window !== "undefined" ? window.location.origin : "https://payment.orki.io";

const metadata = {
  name: "Orki",
  description: "Pay with crypto through Orki",
  url: origin,
  icons: [`${origin}/orki-icon-192.png`],
};


// The connect modal shows four wallets before "Search Wallet". Featured wallets
// take those slots in this order, so these four always come first; any other
// wallet is still found through Search Wallet. IDs are the wallets' ids in
// Reown's wallet explorer, the same list Search Wallet uses.
const FEATURED_WALLET_IDS = [
  "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
  "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", // Trust Wallet
  "8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4", // Binance Wallet
  "fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa", // Base (formerly Coinbase Wallet)
];

// Create the modal
export const modal = createAppKit({
  adapters: [solanaWeb3JsAdapter, wagmiAdapter],
  projectId,
  networks,
  metadata,
  featuredWalletIds: FEATURED_WALLET_IDS,
  themeMode: 'light',
  features: {
    analytics: true
  },
  themeVariables: {
    '--w3m-accent': '#000000',
  }
})

function ContextProvider({ children, cookies }: { children: ReactNode, cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider
