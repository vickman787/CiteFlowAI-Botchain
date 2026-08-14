import { NextRequest, NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import crypto from 'crypto'

const MAX_MESSAGE_AGE_MS = 10 * 60 * 1000 // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json()

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing address, message, or signature' }, { status: 400 })
    }

    const claimedAddress = (address as string).toLowerCase()

    // The message must be one we'd plausibly have issued: it names this
    // address and was signed recently. There's no server-stored nonce (kept
    // stateless), so a stolen signature is only replayable within this window.
    const addressLine = `Address: ${claimedAddress}`
    if (!message.toLowerCase().includes(addressLine)) {
      return NextResponse.json({ error: 'Signed message does not match the claimed address' }, { status: 400 })
    }

    const timestampMatch = message.match(/Timestamp: (\S+)/)
    const timestamp = timestampMatch ? Date.parse(timestampMatch[1]) : NaN
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > MAX_MESSAGE_AGE_MS) {
      return NextResponse.json({ error: 'Signed message has expired. Please try connecting again.' }, { status: 400 })
    }

    // 1. Cryptographically recover the signer — this is the only source of truth
    // for wallet ownership; the client-supplied `address` is just a claim until this checks out.
    const recovered = await recoverMessageAddress({ message, signature })
    if (recovered.toLowerCase() !== claimedAddress) {
      return NextResponse.json({ error: 'Signature does not match the claimed address' }, { status: 401 })
    }

    if (!process.env.WALLET_AUTH_SECRET) {
      return NextResponse.json({ error: 'Missing WALLET_AUTH_SECRET' }, { status: 500 })
    }

    // 2. We now cryptographically know the caller owns this wallet address.
    // Create an "invisible Supabase session" for them, same pattern as before.
    const supabase = await createClient()
    const email = `${claimedAddress}@citeflow.local`
    const password = crypto.createHash('sha256').update(claimedAddress + process.env.WALLET_AUTH_SECRET).digest('hex')

    let userId: string | null = null

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        console.error('Invisible Supabase SignUp Error:', signUpError)
        return NextResponse.json({ error: 'Failed to create internal user session' }, { status: 500 })
      }
      userId = signUpData.user?.id ?? null
    } else {
      userId = signInData.user?.id ?? null
    }

    if (userId) {
      // Wait for Supabase's handle_new_user trigger to finish creating the row.
      await new Promise((resolve) => setTimeout(resolve, 500))

      const adminAuth = createAdminClient()

      const { error: profileError } = await adminAuth
        .from('profiles')
        .update({ wallet_address: claimedAddress })
        .eq('id', userId)

      if (profileError) console.error('Admin Profile Update Error:', profileError)

      await adminAuth
        .from('creator_profiles')
        .insert({ user_id: userId })
        .select()
        .single()
      // Ignore error if it already exists (duplicate key)
    }

    return NextResponse.json({ success: true, walletAddress: claimedAddress })
  } catch (error: any) {
    console.error('Wallet Auth Error:', error)
    return NextResponse.json({ error: 'Failed to execute wallet sign-in' }, { status: 500 })
  }
}
