import { useEffect, useState } from 'react'

// Wallet state (wagmi's useAccount) is only known client-side — the server
// always renders "disconnected," but a browser wallet that already
// authorized this origin (e.g. MetaMask) can auto-reconnect immediately on
// the client, before hydration. Gate any wallet-dependent render on this
// hook to avoid a hydration mismatch between the server and first client
// paint.
export function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}
