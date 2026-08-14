import { defineChain } from 'viem'

// BOT Chain Mainnet — verified live against the RPC (eth_chainId -> 0x2a5 / 677).
export const botChain = defineChain({
  id: 677,
  name: 'BOT Chain',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.botchain.ai'] },
  },
  blockExplorers: {
    default: { name: 'BOTScan', url: 'https://scan.botchain.ai' },
  },
})

// Bridged USDT on BOT Chain Mainnet — confirmed via the explorer's token API
// (288k+ holders, unlike every "USDC"-labelled token on the same chain, which
// has 1-5 holders and is a throwaway test token, not a real deployment).
export const USDT_ADDRESS = '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C' as const
export const USDT_DECIMALS = 6
