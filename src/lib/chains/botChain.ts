import { defineChain } from 'viem'

// BOT Chain Mainnet is the default (chain 677, verified live: eth_chainId ->
// 0x2a5). Override via env to point the whole app at BOT Chain testnet
// (chain 968, rpc.bohr.life) for pre-mainnet validation instead.
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_BOT_CHAIN_ID || 677)
const RPC_URL = process.env.NEXT_PUBLIC_BOT_RPC_URL || 'https://rpc.botchain.ai'
const EXPLORER_URL = process.env.NEXT_PUBLIC_BOT_EXPLORER_URL || 'https://scan.botchain.ai'

export const botChain = defineChain({
  id: CHAIN_ID,
  name: CHAIN_ID === 677 ? 'BOT Chain' : 'BOT Chain Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'BOTScan', url: EXPLORER_URL },
  },
})

export const EXPLORER_TX_URL = EXPLORER_URL

// Bridged USDT on BOT Chain Mainnet by default — confirmed via the explorer's
// token API (288k+ holders, unlike every "USDC"-labelled token on the same
// chain, which has 1-5 holders and is a throwaway test token). Override via
// env when pointed at testnet.
export const USDT_ADDRESS = (process.env.NEXT_PUBLIC_USDT_CONTRACT_ADDRESS || '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C') as `0x${string}`
export const USDT_DECIMALS = 6
