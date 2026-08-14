import hre from 'hardhat'

// Bridged USDT on BOT Chain Mainnet (confirmed via the explorer's token API —
// 288k+ holders, unlike every "USDC"-labelled token on the same chain).
const MAINNET_USDT = '0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C'

async function main() {
  const usdtAddress = process.env.USDT_CONTRACT_ADDRESS || MAINNET_USDT

  console.log(`Deploying CiteFlowPayouts with USDT = ${usdtAddress} on network ${hre.network.name}...`)

  const CiteFlowPayouts = await hre.ethers.getContractFactory('CiteFlowPayouts')
  const payouts = await CiteFlowPayouts.deploy(usdtAddress)
  await payouts.waitForDeployment()

  const address = await payouts.getAddress()
  console.log(`CiteFlowPayouts deployed to: ${address}`)
  console.log(`Set NEXT_PUBLIC_PAYOUTS_CONTRACT_ADDRESS=${address} in .env.local`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
