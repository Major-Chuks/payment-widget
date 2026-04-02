'use client'

import { solanaWeb3JsAdapter, projectId, networks, wagmiAdapter } from '@/config'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Set up queryClient
const queryClient = new QueryClient()

// Set up metadata
const metadata = {
  name: "Orki-Money",
  description: "Swap",
  url: "https://orki-widget.vercel.app/",
  icons: ["https://orki-money.vercel.app/_next/static/media/logo.2ff79353.svg"],
};


// Create the modal
export const modal = createAppKit({
  adapters: [solanaWeb3JsAdapter, wagmiAdapter],
  projectId,
  networks,
  metadata,
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
