import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

const PLATFORM_FEE_PERCENT = 0.20

export async function authorizePayment(sessionId: string, sourceId: string, priceUsdt: number) {
  const supabase = await createClient()

  // 1. Enforce Budget Limits
  const today = new Date().toISOString().split('T')[0]

  // Upsert today's treasury limit if it doesn't exist
  await supabase.from('treasury_limits').upsert({ date: today, daily_limit_usdc: 100.00 }, { onConflict: 'date' })

  const { data: limits, error: limitError } = await supabase
    .from('treasury_limits')
    .select('daily_limit_usdc, spent_today_usdc')
    .eq('date', today)
    .single()

  if (limitError || !limits) {
    throw new Error('Could not verify treasury limits')
  }

  if (parseFloat(limits.spent_today_usdc) + priceUsdt > parseFloat(limits.daily_limit_usdc)) {
    throw new Error('Agent Treasury daily spending limit reached')
  }

  const { data: session, error: sessionError } = await supabase
    .from('research_sessions')
    .select('budget_usdc')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    throw new Error('Research session not found')
  }

  // Calculate spent in session so far
  const { data: auths } = await supabase
    .from('payment_authorizations')
    .select('amount_usdc')
    .eq('session_id', sessionId)

  const sessionSpent = auths?.reduce((acc, val) => acc + parseFloat(val.amount_usdc), 0) || 0

  if (sessionSpent + priceUsdt > parseFloat(session.budget_usdc)) {
    throw new Error('Research session budget exceeded')
  }

  // 2. Resolve the creator's payout wallet
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('creator_profiles(profiles(wallet_address))')
    .eq('id', sourceId)
    .single()

  const recipient = (source as any)?.creator_profiles?.profiles?.wallet_address as string | undefined
  if (sourceError || !recipient) {
    throw new Error('Creator has not configured a wallet address for this source')
  }

  const amountUsdt = priceUsdt * (1 - PLATFORM_FEE_PERCENT)

  // 3. Record Authorization — stays 'pending' until the batched on-chain
  // settlement in runResearchAgent actually confirms.
  const authorizationId = `auth_${crypto.randomBytes(12).toString('hex')}`

  const { error: insertError } = await supabase
    .from('payment_authorizations')
    .insert({
      session_id: sessionId,
      source_id: sourceId,
      authorization_id: authorizationId,
      amount_usdc: priceUsdt,
      status: 'pending'
    })

  if (insertError) {
    throw new Error('Failed to record payment authorization')
  }

  // 4. Update daily spent
  await supabase
    .from('treasury_limits')
    .update({ spent_today_usdc: parseFloat(limits.spent_today_usdc) + priceUsdt })
    .eq('date', today)

  return {
    authorizationId,
    recipient: recipient as `0x${string}`,
    amountUsdt,
  }
}
