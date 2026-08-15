import { createPublicClient, createWalletClient, http, parseUnits, keccak256, stringToHex, parseEventLogs } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { botChain, USDT_ADDRESS, USDT_DECIMALS } from '@/lib/chains/botChain'

const PAYOUTS_ABI = [
  {
    name: 'distribute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'recipients', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'refundTo', type: 'address' },
      { name: 'refundAmount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

export const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

function getPayoutsAddress(): `0x${string}` {
  const address = process.env.NEXT_PUBLIC_PAYOUTS_CONTRACT_ADDRESS
  if (!address) throw new Error('NEXT_PUBLIC_PAYOUTS_CONTRACT_ADDRESS is not configured')
  return address as `0x${string}`
}

function getTreasuryAccount() {
  const key = process.env.BOT_TREASURY_PRIVATE_KEY
  if (!key) throw new Error('BOT_TREASURY_PRIVATE_KEY is not configured')
  return privateKeyToAccount(key as `0x${string}`)
}

export const publicClient = createPublicClient({ chain: botChain, transport: http() })

export interface PayoutEntry {
  recipient: `0x${string}`
  amountUsdt: number
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

// Pays every cited creator and refunds unspent budget in a single BOT Chain
// transaction, via the CiteFlowPayouts contract's distribute() — one
// auditable settlement per research session.
export async function settleSession(
  sessionId: string,
  payouts: PayoutEntry[],
  refundTo: string | undefined,
  refundAmountUsdt: number
): Promise<string> {
  const account = getTreasuryAccount()
  const walletClient = createWalletClient({ account, chain: botChain, transport: http() })

  // Supabase session ids are UUIDs — hash to a deterministic bytes32 for the contract's indexed event topic.
  const sessionIdBytes32 = keccak256(stringToHex(sessionId))

  const hash = await walletClient.writeContract({
    address: getPayoutsAddress(),
    abi: PAYOUTS_ABI,
    functionName: 'distribute',
    args: [
      sessionIdBytes32,
      payouts.map((p) => p.recipient),
      payouts.map((p) => parseUnits(p.amountUsdt.toFixed(USDT_DECIMALS), USDT_DECIMALS)),
      (refundTo as `0x${string}` | undefined) || ZERO_ADDRESS,
      parseUnits(Math.max(refundAmountUsdt, 0).toFixed(USDT_DECIMALS), USDT_DECIMALS),
    ],
  })

  await publicClient.waitForTransactionReceipt({ hash })
  return hash
}

// Verifies a funding transaction: a plain USDT `transfer` to the payouts contract
// for at least `minAmountUsdt`. Returns the payer address, used as the refund
// destination when the session settles.
export async function verifyFundingTransfer(txHash: string, minAmountUsdt: number) {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` })
  if (receipt.status !== 'success') {
    throw new Error('Funding transaction did not succeed on-chain')
  }

  const payoutsAddress = getPayoutsAddress().toLowerCase()
  const usdtAddress = USDT_ADDRESS.toLowerCase()
  const minAmount = parseUnits(minAmountUsdt.toFixed(USDT_DECIMALS), USDT_DECIMALS)

  const transferLogs = parseEventLogs({
    abi: ERC20_TRANSFER_ABI,
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === usdtAddress),
    eventName: 'Transfer',
  })

  for (const log of transferLogs) {
    if (log.args.to.toLowerCase() === payoutsAddress && log.args.value >= minAmount) {
      return { payerAddress: log.args.from }
    }
  }

  throw new Error('No sufficient USDT transfer to the treasury contract found in that transaction')
}
