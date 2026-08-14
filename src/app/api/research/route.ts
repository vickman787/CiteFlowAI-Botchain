import { NextRequest, NextResponse } from 'next/server'
import { runResearchAgent } from '@/lib/ai/research-agent'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { verifyFundingTransfer } from '@/lib/payments/botchain'
import { z } from 'zod'

const researchRequestSchema = z.object({
  query: z.string().min(5),
  maxBudget: z.number().min(0).max(100),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
})

export async function POST(request: NextRequest) {
  try {
    // Identify the caller from their Supabase session cookies (set by wallet sign-in)
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please connect your wallet first.' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = researchRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { query, maxBudget, txHash } = parsed.data

    // Verify the upfront USDT transfer landed on BOT Chain before doing any work
    let funding
    try {
      funding = await verifyFundingTransfer(txHash, maxBudget)
    } catch (verifyError: any) {
      console.error('Funding verification failed:', verifyError)
      return NextResponse.json({ error: `Payment verification failed: ${verifyError.message}` }, { status: 402 })
    }

    const supabase = createAdminClient()

    // Replay guard: each funding transaction can only fund one research session
    const { data: priorUse } = await supabase
      .from('audit_events')
      .select('id')
      .eq('event_type', 'funding_tx_used')
      .eq('details->>txHash', txHash)
      .limit(1)

    if (priorUse && priorUse.length > 0) {
      return NextResponse.json({ error: 'This payment has already been used to fund a research session' }, { status: 409 })
    }

    // Refund destination is the verified payer, falling back to the profile wallet
    let refundAddress: string | undefined = funding.payerAddress
    if (!refundAddress) {
      const { data: profile } = await userClient
        .from('profiles')
        .select('wallet_address')
        .eq('id', user.id)
        .single()
      refundAddress = profile?.wallet_address || undefined
    }

    // 1. Create a Research Session owned by the authenticated user
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .insert({
        user_id: user.id,
        query,
        budget_usdc: maxBudget,
        status: 'active'
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      console.error("Session creation error:", sessionError)
      return NextResponse.json({ error: 'Failed to create research session', details: sessionError?.message || "Unknown DB Error" }, { status: 500 })
    }

    await supabase.from('audit_events').insert({
      event_type: 'funding_tx_used',
      details: {
        txHash,
        sessionId: session.id,
        userId: user.id,
        amount: maxBudget
      }
    })

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        const pushUpdate = (type: string, payload: any) => {
          controller.enqueue(encoder.encode(JSON.stringify({ type, payload }) + '\n'))
        }

        try {
          const result = await runResearchAgent(
            session.id,
            query,
            maxBudget,
            refundAddress,
            (msg) => pushUpdate('progress', msg)
          )

          // Mark session complete and save the result payload
          await supabase
            .from('research_sessions')
            .update({ status: 'completed', result: result })
            .eq('id', session.id)

          pushUpdate('done', { result, sessionId: session.id })
          controller.close()
        } catch (error: any) {
          pushUpdate('error', error.message)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Research API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
