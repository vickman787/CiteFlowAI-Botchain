# CiteFlowAI on BOT Chain: Product Roadmap

CiteFlowAI is a pay-per-prompt research agent: a researcher locks a budget, the agent grounds its answer only in registered, ownership-verified sources, and every source it actually cites gets paid in USDT — automatically, the moment the citation happens, settled on BOT Chain.

This is a from-scratch migration of CiteFlowAI's research/payment logic onto BOT Chain, built for the BOT Chain Builder Challenge #2 (AI Native Applications track). The prior version of this product settled on Arc Testnet via Circle Wallets and exposed an x402/MCP agent-payment surface — none of that is part of this build; this repo is BOT Chain-only.

---

## ✅ Shipped

### 1. Pay-per-prompt economy, self-custodied
- Wallet-connect onboarding (wagmi/viem, injected EVM connector) with sign-in-with-wallet authentication — no email, no seed phrase held by us.
- Budget escrow: researchers fund a session with a single USDT transfer to the deployed `CiteFlowPayouts` contract; unspent budget refunds automatically once the agent finishes.
- Embedding-based retrieval (Supabase pgvector) over registered sources, so citation is tied to relevance, not keyword match.
- Every citation payout **and** the session's refund settle in one batched `distribute()` call per session — a single, inspectable BOT Chain transaction instead of one call per citation.
- Multi-model LLM fallback: Gemini 2.5 Flash primary, automatic fallback to Claude on rate limits.
- Terminal-themed live ledger dashboard showing budgets, citations, and payouts in real time.

### 2. On-chain settlement contract
- `contracts/CiteFlowPayouts.sol`: holds session funding as escrow, pays every cited creator and refunds unspent budget in one transaction, emits a `SessionSettled` event for auditability.
- Hardhat setup (`hardhat.config.ts`, `scripts/deploy.ts`) targeting both BOT Chain testnet and mainnet.
- Deployed and verified on BOT Chain testnet (chain 968); contract ownership confirmed to match the treasury address on-chain.

### 3. Creator ownership verification (hard gate)
- Domain, X, Medium, and Substack verification required *before* a source can be registered.
- Enforced by a database constraint, not application logic.
- Closes the gap where anyone could previously register someone else's article and intercept their payments.

### 4. Clean break from the prior payment stack
- Removed Circle Wallets, the x402 resource server, and the standalone MCP server entirely — this build has no autonomous-agent payment surface, just a human using the website with their own wallet.
- Funding verification and settlement rewired off Circle Gateway onto direct BOT Chain RPC calls (viem), reading the actual on-chain USDT transfer instead of trusting a third-party API.

---

## 🚧 Next

### 1. Full end-to-end test on testnet
Connect a real wallet, register a source, fund a research session with testnet USDT, and confirm a `distribute()` transaction pays out correctly on `scan.bohr.life`.

### 2. Mainnet deployment
Redeploy `CiteFlowPayouts` to BOT Chain mainnet (677), point the app's env at mainnet USDT and the new contract address, and fund the treasury with real BOT for gas.

### 3. Public demo + submission materials
Host a public instance, record a BOT Chain-specific demo video (the prior Arc/Circle walkthrough no longer reflects this build), and prepare the migration-project writeup the Challenge requires (why BOT Chain, what's new, how we'll keep building on it).

### 4. Tighter refund/settlement guarantees
The current design settles per-session via one `distribute()` call, which is already a stronger guarantee than the old per-citation batched-Gateway model. Still worth stress-testing: partial-failure handling if `distribute()` reverts mid-session, and gas-price spikes on the treasury's calls.

### 5. More verification rails
Expand beyond domain, X, Medium, and Substack as creators ask for them.
