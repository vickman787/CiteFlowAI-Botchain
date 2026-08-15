import { createAdminClient } from '@/utils/supabase/admin'

export const CREATOR_SHARE = 0.8 // 20% platform fee

export interface NetworkStats {
  answersServed: number
  paidToCreators: number
  avgAnswerCost: number
  registeredSources: number
}

// Live network stats from the ledger — used by the ticker and the landing page tiles.
// Needs the admin client: research_sessions' RLS policy scopes rows to their
// owner (user_id = auth.uid()), but this is a network-wide public stat, not
// a per-user one — the regular client would only ever see the current
// viewer's own sessions.
export async function getNetworkStats(): Promise<NetworkStats> {
  const supabase = createAdminClient()

  const [{ count: answersServed }, { data: settledAmounts }, { count: registeredSources }] = await Promise.all([
    supabase.from('research_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('payment_authorizations').select('amount_usdc').eq('status', 'settled'),
    supabase.from('sources').select('*', { count: 'exact', head: true }).eq('status', 'extracted'),
  ])

  const totalSettled = (settledAmounts || []).reduce((acc, r) => acc + parseFloat(r.amount_usdc), 0)
  const paidToCreators = totalSettled * CREATOR_SHARE

  return {
    answersServed: answersServed || 0,
    paidToCreators,
    avgAnswerCost: answersServed ? totalSettled / answersServed : 0,
    registeredSources: registeredSources || 0,
  }
}
