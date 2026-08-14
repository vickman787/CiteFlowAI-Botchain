import { createConfig, http } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { botChain } from '@/lib/chains/botChain'

// Injected-only (MetaMask, BOT Wallet, or any EIP-1193 browser wallet) — no
// WalletConnect project needed to satisfy "wallet connection completes the
// core business flow." Can be extended with a WalletConnect connector later
// for mobile support.
export const wagmiConfig = createConfig({
  chains: [botChain],
  connectors: [injected()],
  transports: {
    [botChain.id]: http(),
  },
})
