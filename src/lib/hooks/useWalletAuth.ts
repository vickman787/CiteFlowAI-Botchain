'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { createClient } from '@/utils/supabase/client'
import { useMounted } from './useMounted'

// A connected wallet (wagmi) is not the same as a signed-in user — a browser
// wallet can auto-reconnect to an origin it previously authorized without
// the sign-in-with-wallet message ever being signed, which leaves no
// Supabase session. Pages that gate a real action (registering a source,
// spending funds) must check both.
export function useWalletAuth() {
  const mounted = useMounted()
  const { address: rawAddress, isConnected: rawIsConnected } = useAccount()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  const [userLoaded, setUserLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setUserLoaded(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setUserLoaded(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const address = mounted ? rawAddress : undefined
  const walletConnected = mounted && rawIsConnected && !!address
  const isSignedIn = walletConnected && !!user

  return { mounted, address, walletConnected, isSignedIn, userLoaded }
}
