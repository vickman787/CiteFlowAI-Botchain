import type { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const treasuryKey = process.env.BOT_TREASURY_PRIVATE_KEY
const accounts = treasuryKey ? [treasuryKey] : []

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    botMainnet: {
      url: 'https://rpc.botchain.ai',
      chainId: 677,
      accounts,
    },
    // BOT Chain testnet — chain id/RPC not yet confirmed (see faucet.botchain.ai/basic/
    // or the dev docs). Fill in BOT_TESTNET_RPC_URL / BOT_TESTNET_CHAIN_ID before
    // running `npm run deploy:testnet`.
    botTestnet: {
      url: process.env.BOT_TESTNET_RPC_URL || '',
      chainId: process.env.BOT_TESTNET_CHAIN_ID ? Number(process.env.BOT_TESTNET_CHAIN_ID) : undefined,
      accounts,
    },
  },
}

export default config
