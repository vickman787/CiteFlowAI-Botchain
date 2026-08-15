# CiteFlowAI

> **The research agent that pays its sources.**
> Ask a question. Get a grounded, cited answer. The creators behind it get paid — in USDT, automatically, the moment the citation happens.

CiteFlowAI is a Web3-native AI research agent built to solve a problem every AI product shares: **content creators are rarely compensated when an agent scrapes and synthesizes their work.** A researcher locks a budget, the agent grounds its answer only in registered, verified sources, and every source it actually cites gets paid on the spot — no subscriptions, no ad revenue splits, no invoices.

This build settles on **BOT Chain** — a self-custodied wallet connects, funds a research session with a single USDT transfer, and the treasury settles every citation payout (plus any refund) in one on-chain transaction via a purpose-built payout contract.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat&logo=supabase)
![BOT Chain](https://img.shields.io/badge/Network-BOT_Chain-success?style=flat)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat&logo=solidity)

---

## How the money moves

1. **Wallet connect + sign-in:** The researcher connects any EVM wallet (MetaMask, BOT Wallet, or similar) and signs a short message to prove ownership — no email, no seed phrase leaves the wallet.
2. **Budget escrow:** The researcher sends USDT directly to the deployed `CiteFlowPayouts` contract to fund a session's budget (e.g. `$1.00 USDT`) — one on-chain transaction, no recurring subscription.
3. **Metered citation payments:** The agent evaluates registered, ownership-verified sources against the query. Every source it actually cites gets paid — the rest cost nothing.
4. **Platform fee:** A small percentage of each citation payment covers LLM inference and infrastructure.
5. **Single settlement transaction:** Once the agent finishes, the treasury calls `distribute()` once — paying every cited creator and refunding any unspent budget back to the researcher, all in one auditable BOT Chain transaction.

## ✨ Core Features

- **Creator ownership verification (hard gate):** Before anyone can register a source, they must prove control of it — domain, X, Medium, or Substack. Enforced by a database constraint, not application logic, so no one can register someone else's work and intercept their payments.
- **Self-custodied wallet identity:** Connect + sign-in-with-wallet, no email, no seed phrase held by us. The backend maps the verified wallet address into a Supabase auth session so research history and payouts persist across devices.
- **RAG via embeddings:** Registered sources are embedded and retrieved by relevance (`src/lib/ai/embeddings.ts`), not keyword match, so citation and payment are tied to what actually grounded the answer.
- **Multi-model LLM fallback:** Primary synthesis via Gemini 2.5 Flash, with automatic fallback to Claude on rate limits.
- **Live ledger:** A terminal-themed dashboard showing real-time budgets, citations, and payouts as they settle on-chain.
- **On-chain settlement contract:** `contracts/CiteFlowPayouts.sol` holds session funding as escrow and settles every citation payout plus refund in a single transaction, verifiable on the BOT Chain explorer.

## 🛠️ Primitives for builders (open source)

- **`src/lib/ai/research-agent.ts`** — the LLM orchestration loop: evaluates source relevance, decides what to cite, and drives the payment ledger.
- **`src/lib/ai/embeddings.ts`** — embedding generation and similarity retrieval over registered sources.
- **`src/lib/payments/botchain.ts`** / **`src/lib/payments/treasury.ts`** — BOT Chain settlement (viem) and the pay-per-prompt escrow/refund bookkeeping.
- **`contracts/CiteFlowPayouts.sol`** — the on-chain escrow/settlement contract, with a Hardhat setup (`hardhat.config.ts`, `scripts/deploy.ts`) for compiling and deploying it.
- **`src/lib/verification/`** — domain/social ownership verification used to gate source registration.
- **`src/lib/wagmi/`** / **`src/lib/chains/botChain.ts`** — wallet-connect config and the BOT Chain network definition.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Supabase project
- A BOT Chain treasury wallet (self-custodied EOA, funded with native BOT for gas)
- A deployed `CiteFlowPayouts` contract (see [Deploying the contract](#deploying-the-contract) below)

### Environment Variables
Copy `.env.local` (or create one) and fill in your keys:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# BOT Chain
BOT_TREASURY_PRIVATE_KEY=your_treasury_private_key
NEXT_PUBLIC_USDT_CONTRACT_ADDRESS=bot_chain_usdt_address
NEXT_PUBLIC_PAYOUTS_CONTRACT_ADDRESS=your_deployed_payouts_contract
WALLET_AUTH_SECRET=a_random_secret_for_session_signing
```

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the live app.

### Deploying the contract

```bash
npm run compile          # compile contracts/CiteFlowPayouts.sol
npm run deploy:testnet   # deploy to BOT Chain testnet
npm run deploy:mainnet   # deploy to BOT Chain mainnet
```

Each deploy prints the new contract address — set it as `NEXT_PUBLIC_PAYOUTS_CONTRACT_ADDRESS`.

### Applying database migrations

```bash
MIGRATION_DB_URL="postgresql://..." npm run apply-migrations
```

Runs every file in `supabase/migrations/` in order against a fresh Supabase Postgres database.

## 📄 License
MIT License
