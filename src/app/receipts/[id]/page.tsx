import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { EXPLORER_TX_URL } from '@/lib/chains/botChain'

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: auth } = await supabase
    .from('payment_authorizations')
    .select(`
      *,
      sources (title, url, creator_id),
      payment_settlements (*)
    `)
    .eq('id', params.id)
    .single()

  if (!auth) {
    notFound()
  }

  const settlement = auth.payment_settlements?.[0]
  const source = auth.sources

  return (
    <div className="flex-1 flex flex-col pt-12 px-8 max-w-4xl mx-auto w-full">
      <div className="mb-12 border-b border-[var(--color-border-subtle)] pb-8">
        <h1 className="text-4xl font-serif mb-4">Citation Receipt</h1>
        <p className="text-lg opacity-80 font-mono">
          ID: {auth.id}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="bg-[var(--color-panel)] border border-[var(--color-border-subtle)] p-6 ">
          <h2 className="text-xs font-mono uppercase tracking-widest opacity-60 mb-4">Payment Details</h2>
          <div className="space-y-4 font-mono text-sm">
            <div>
              <span className="opacity-60 block">Status:</span>
              <span className={`font-bold ${settlement?.status === 'settled' ? 'text-signal-green' : 'text-rust'}`}>
                {settlement ? settlement.status.toUpperCase() : 'PENDING'}
              </span>
            </div>
            <div>
              <span className="opacity-60 block">Amount:</span>
              <span className="text-xl">${parseFloat(auth.amount_usdc).toFixed(2)} USDT</span>
            </div>
            <div>
              <span className="opacity-60 block">Authorization ID:</span>
              <span className="break-all text-xs block bg-[var(--color-paper)] p-2 mt-1 border border-[var(--color-border-subtle)]">
                {auth.authorization_id}
              </span>
            </div>
            {settlement?.transaction_hash && (
              <div>
                <span className="opacity-60 block">BOT Chain Transaction:</span>
                <a
                  href={`${EXPLORER_TX_URL}/tx/${settlement.transaction_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-[var(--color-ink)] underline hover:text-signal-green transition-colors"
                >
                  {settlement.transaction_hash}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-panel)] border border-[var(--color-border-subtle)] p-6 ">
          <h2 className="text-xs font-mono uppercase tracking-widest opacity-60 mb-4">Cited Intellectual Property</h2>
          <div className="space-y-4 font-mono text-sm">
            <div>
              <span className="opacity-60 block">Title:</span>
              <span className="font-bold">{source?.title}</span>
            </div>
            <div>
              <span className="opacity-60 block">URL:</span>
              <a href={source?.url} target="_blank" rel="noreferrer" className="text-[var(--color-ink)] underline break-all hover:text-signal-green transition-colors">
                {source?.url}
              </a>
            </div>
            <div>
              <span className="opacity-60 block">Creator ID:</span>
              <span>{source?.creator_id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
