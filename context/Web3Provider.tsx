// @ts-nocheck
'use client'

import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { mainnet, base, solana, arbitrum } from '@reown/appkit/networks'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

const queryClient = new QueryClient()

// Get your projectId at https://cloud.reown.com (It takes 1 minute)
const projectId = 'e9c16ece803fcdbe63e44c3a34c430f0' 

const networks = [mainnet, base, solana, arbitrum]

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId
})

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'x', 'github'],
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#84cc16', // Quantix Lime
    '--w3m-border-radius-master': '20px',
    '--w3m-background-color': '#050505',
  }
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}