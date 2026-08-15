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
    if (!message.toLowerCase().includes(addressLine.toLowerCase())) {
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
    // Supabase Auth rejects non-public TLDs like ".local" as an invalid email
    // format, so this has to look like a real address even though it's never
    // actually sent anywhere — citeflowai.xyz is a domain we actually own.
    const email = `${claimedAddress}@wallet.citeflowai.xyz`
    const password = crypto.createHash('sha256').update(claimedAddress + process.env.WALLET_AUTH_SECRET).digest('hex')

    let userId: string | null = null
    const adminAuth = createAdminClient()

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // New identity (or a leftover unconfirmed one) — (re)create it
      // pre-confirmed via the admin API. Supabase's default project settings
      // require email confirmation before signInWithPassword works, and this
      // address is never a real inbox, so that confirmation can never
      // naturally happen; email_confirm: true bypasses it server-side.
      const { data: createData, error: createError } = await adminAuth.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (createError) {
        console.error('Invisible Supabase User Creation Error:', createError)
        return NextResponse.json({ error: 'Failed to create internal user session' }, { status: 500 })
      }

      const { data: retrySignIn, error: retrySignInError } = await supabase.auth.signInWithPassword({ email, password })
      if (retrySignInError) {
        console.error('Invisible Supabase Sign-In After Create Error:', retrySignInError)
        return NextResponse.json({ error: 'Failed to create internal user session' }, { status: 500 })
      }
      userId = retrySignIn.user?.id ?? createData.user?.id ?? null
    } else {
      userId = signInData.user?.id ?? null
    }

    if (userId) {
      // Wait for Supabase's handle_new_user trigger to finish creating the row.
      await new Promise((resolve) => setTimeout(resolve, 500))

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
