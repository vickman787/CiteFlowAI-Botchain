import Link from 'next/link';
import { Droplet, FileText, Search, Wallet, Cpu, CheckCircle } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="flex-1 flex flex-col pt-12 pb-24 content-container max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 text-[var(--color-ink)]">
          Documentation
        </h1>
        <p className="text-lg text-[var(--color-soft-ink)] mb-8">
          Everything you need to know about using CiteFlowAI, whether you are researching topics or registering your own intellectual property.
        </p>

        {/* Video Guide — TODO: record a BOT Chain walkthrough to replace this placeholder */}
        <div className="relative w-full aspect-video rounded overflow-hidden shadow-lg border border-[var(--color-border-subtle)] bg-[var(--color-panel-deep)] flex items-center justify-center">
          <p className="font-mono text-sm text-[var(--color-faint)]">Video walkthrough coming soon</p>
        </div>
      </div>

      <div className="space-y-16">
        
        {/* Section 1: Introduction */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] pb-2">
            <Cpu className="text-[var(--color-olive)]" size={24} />
            <h2 className="text-2xl font-serif font-bold text-[var(--color-ink)]">What is CiteFlowAI?</h2>
          </div>
          <div className="prose prose-lg text-[var(--color-ink)] font-sans leading-relaxed">
            <p>
              CiteFlowAI is a decentralized AI research terminal designed to fix the creator compensation problem in generative AI. 
              Currently, AI models are trained on millions of articles, but the original authors receive no compensation when their work is used to generate answers.
            </p>
            <p>
              CiteFlowAI changes this by introducing <strong>Pay-Per-Prompt Citations</strong>. When our AI agent synthesizes an answer using a registered knowledge base, it explicitly cites its sources and triggers a single on-chain transaction that instantly pays USDT nanopayments to the original creators on <strong>BOT Chain</strong>.
            </p>
          </div>
        </section>

        {/* Section 2: For Researchers */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] pb-2">
            <Search className="text-[var(--color-olive)]" size={24} />
            <h2 className="text-2xl font-serif font-bold text-[var(--color-ink)]">For Researchers (Users)</h2>
          </div>
          <div className="space-y-8">
            
            <div className="bg-[var(--color-panel)] p-6 border border-[var(--color-border-subtle)] rounded shadow-sm">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Wallet className="text-[var(--color-signal-green)]" size={20} />
                1. Connect an EVM Wallet
              </h3>
              <p className="text-[var(--color-soft-ink)] mb-4">
                CiteFlowAI is self-custodied — connect any EVM-compatible wallet (MetaMask, BOT Wallet, or similar). No email, no seed phrase leaves your wallet, no funds move without your explicit approval.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink)]">
                <li>Click <strong>Connect Wallet</strong> in the top navigation bar and pick your wallet extension.</li>
                <li>Approve the connection and switch to <strong>BOT Chain Mainnet</strong> if prompted.</li>
                <li>Sign a short message to prove you own the address — this is free, no gas, no funds move.</li>
                <li>You're now authenticated. Your wallet address is your identity.</li>
              </ul>
            </div>

            <div className="bg-[var(--color-panel)] p-6 border border-[var(--color-border-subtle)] rounded shadow-sm">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Droplet className="text-blue-500" size={20} />
                2. Fund Your Wallet
              </h3>
              <p className="text-[var(--color-soft-ink)] mb-4">
                CiteFlowAI settles in <strong>USDT on BOT Chain Mainnet</strong>. You'll need a small amount of USDT to pay for research, plus native <strong>BOT</strong> for gas.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink)]">
                <li>Bridge or swap into USDT on BOT Chain via the <a href="https://bridge.botchain.ai" target="_blank" rel="noopener noreferrer" className="text-[var(--color-signal-green)] underline">official bridge</a> or <a href="https://dex.botchain.ai" target="_blank" rel="noopener noreferrer" className="text-[var(--color-signal-green)] underline">BOT DEX</a>.</li>
                <li>Keep a small amount of native BOT on hand — it's the gas token for every transaction on the chain.</li>
              </ul>
            </div>

            <div className="bg-[var(--color-panel)] p-6 border border-[var(--color-border-subtle)] rounded shadow-sm">
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <Search className="text-[var(--color-ink)]" size={20} />
                3. Ask the AI
              </h3>
              <p className="text-[var(--color-soft-ink)] mb-4">
                Once your wallet is funded, you can query the AI. You set a "Max Budget" for the prompt (e.g., $0.50), and confirm one USDT transfer to fund the session — signed directly in your wallet, no PIN.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink)]">
                <li>The AI retrieves relevant articles from our vector database and writes an answer.</li>
                <li>Based on which articles were actually cited, the treasury settles the payment in a single on-chain transaction, distributing the exact citation fees to the respective authors and refunding anything unspent.</li>
              </ul>
            </div>

          </div>
        </section>

        {/* Section 3: For Creators */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] pb-2">
            <FileText className="text-[var(--color-olive)]" size={24} />
            <h2 className="text-2xl font-serif font-bold text-[var(--color-ink)]">For Creators (Authors)</h2>
          </div>
          
          <div className="space-y-8">
            <div className="bg-[var(--color-paper)] p-6 border border-[var(--color-border-subtle)] rounded shadow-sm">
              <h3 className="text-xl font-bold mb-3">1. Universal Identity (Wallet-Based)</h3>
              <p className="text-[var(--color-soft-ink)] mb-4">
                There are no separate "user" or "creator" accounts, and absolutely no passwords. Your connected wallet is your entire identity. The moment you connect and sign in via the navbar, our backend automatically maps your address to your creator profile. You never have to manually configure payment settings!
              </p>
            </div>

            <div className="bg-[var(--color-paper)] p-6 border border-[var(--color-border-subtle)] rounded shadow-sm">
              <h3 className="text-xl font-bold mb-3">2. Verify Ownership (Required Before Registering)</h3>
              <p className="text-[var(--color-soft-ink)] mb-4">
                Before you can register an article, you must prove you actually control where it lives. This exists so nobody else can register your work and collect the citation payments meant for you — CiteFlowAI will not create a source from a domain or platform handle you haven&apos;t verified, full stop.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink)]">
                <li>Open the <strong>Verify Ownership</strong> panel on your Dashboard — it shows a unique verification code tied to your account.</li>
                <li>Prove control of a <strong>domain</strong> (add a meta tag or a <code className="px-1.5 py-0.5 bg-[var(--color-panel-deep)] rounded text-sm">/.well-known/citeflow.txt</code> file with the code), an <strong>X</strong> account (post the code in a tweet), a <strong>Medium</strong> profile, or a <strong>Substack</strong> — then paste the link back into the panel.</li>
                <li>Once verified, that identity is <strong>permanently and exclusively yours</strong> — enforced at the database level, not just in the UI. You can then register any article on that domain or handle without repeating this step.</li>
                <li>You can verify as many domains and platforms as you actually own; there&apos;s no limit.</li>
              </ul>
            </div>

            <div className="bg-[var(--color-paper)] p-6 border border-[var(--color-border-subtle)] rounded shadow-sm">
              <h3 className="text-xl font-bold mb-3">3. Registering Articles</h3>
              <p className="text-[var(--color-soft-ink)] mb-4">
                Navigate to the <strong>Register Work</strong> page. Here, you can upload the contents of your research, blog posts, or intellectual property.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink)]">
                <li>Provide the Title, URL, and the full content of your article.</li>
                <li>Set your own <strong>Citation Price</strong> in USDT (e.g., $0.10 per citation).</li>
                <li>Your content is chunked, embedded into our Vector Database, and made available to the AI agent.</li>
              </ul>
            </div>

            <div className="bg-[var(--color-paper)] p-6 border border-[var(--color-border-subtle)] rounded shadow-sm">
              <h3 className="text-xl font-bold mb-3">4. Tracking Earnings</h3>
              <p className="text-[var(--color-soft-ink)] mb-4">
                The <strong>Dashboard</strong> provides a live view of your intellectual property. 
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-ink)]">
                <li>View all your registered articles.</li>
                <li>See exactly how many times each article has been cited by the AI.</li>
                <li>Watch your USDT balance grow in real-time as users interact with the network.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 4: On-Chain Architecture (BOT Chain) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] pb-2">
            <CheckCircle className="text-[var(--color-signal-green)]" size={24} />
            <h2 className="text-2xl font-serif font-bold text-[var(--color-ink)]">On-Chain Architecture (BOT Chain)</h2>
          </div>
          <div className="prose prose-lg text-[var(--color-ink)] font-sans leading-relaxed">
            <p>
              CiteFlowAI settles every citation payment on <strong>BOT Chain Mainnet</strong> (chain id 677), using a standard self-custodied wallet connection — no embedded wallet, no email login.
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li><strong>Wallet connection:</strong> Connect any EVM-compatible wallet (MetaMask, BOT Wallet, or similar). You sign a one-time message to prove ownership of your address — no seed phrase leaves your wallet, no funds ever pass through us before you approve them.</li>
              <li><strong>Funding a research session:</strong> You send USDT directly, from your own wallet, to the deployed <code className="px-1.5 py-0.5 bg-[var(--color-panel-deep)] rounded text-sm">CiteFlowPayouts</code> contract — a single on-chain transaction you approve yourself.</li>
              <li><strong>Automated settlement:</strong> Once the AI agent finishes evaluating sources and decides which were actually cited, the treasury triggers one <code className="px-1.5 py-0.5 bg-[var(--color-panel-deep)] rounded text-sm">distribute()</code> call on that contract, paying every cited creator and refunding any unspent budget back to you — all in a single, inspectable BOT Chain transaction.</li>
              <li><strong>Settlement asset:</strong> <strong>USDT</strong> on BOT Chain Mainnet. Every transaction is publicly verifiable on <a href="https://scan.botchain.ai" target="_blank" rel="noopener noreferrer" className="text-[var(--color-signal-green)] underline">scan.botchain.ai</a>.</li>
            </ul>
          </div>
        </section>

      </div>
    </div>
  );
}
