"use client"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Menu, X, LogIn, LogOut, Copy, Check, ExternalLink, ChevronDown } from "lucide-react";
import { useAccount, useDisconnect, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { createClient } from "@/utils/supabase/client";
import { USDT_ADDRESS, USDT_DECIMALS, botChain, EXPLORER_TX_URL } from "@/lib/chains/botChain";
import { useMounted } from "@/lib/hooks/useMounted";
import WalletModal from "./WalletModal";

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="118" fill="#C6FF4D" />
      <path d="M133,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="#0C0E0A" />
      <path d="M283,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="#0C0E0A" />
    </svg>
  );
}

export function Navigation({ initialUser }: { initialUser?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(initialUser || null);
  const [isCopied, setIsCopied] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Never trust wallet state until we're past hydration — the server always
  // renders "disconnected" (it can't know), but a browser wallet that already
  // authorized this origin can report "connected" on the very first client
  // render, which would otherwise mismatch the server-rendered HTML.
  const walletConnected = mounted && isConnected && !!address;
  const walletSignedIn = walletConnected && !!user;

  const { data: rawBalance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: botChain.id,
    query: { enabled: walletConnected, refetchInterval: 15000 },
  });

  const walletBalance = rawBalance !== undefined ? formatUnits(rawBalance, USDT_DECIMALS) : null;

  // Close the wallet dropdown on outside click or Escape
  useEffect(() => {
    if (!isWalletMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(e.target as Node)) {
        setIsWalletMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsWalletMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isWalletMenuOpen]);

  useEffect(() => {
    setUser(initialUser || null);
  }, [initialUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    disconnect();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleCopy = () => {
    if (address) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(address)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = address
        document.body.appendChild(textArea)
        textArea.select()
        try {
          document.execCommand('copy')
        } catch (err) {
          console.error('Copy failed', err)
        }
        document.body.removeChild(textArea)
      }
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  };

  const navLinks = [
    { href: "/research", label: "agent" },
    { href: "/register-article", label: "register" },
    { href: "/dashboard", label: "dashboard" },
    { href: "/docs", label: "docs" },
  ];

  return (
    <nav className="w-full bg-[var(--color-paper)] border-b border-[var(--color-border-subtle)] sticky top-0 z-40">
      <div className="content-container h-16 flex items-center gap-6 xl:gap-8">

        {/* Logo and Wordmark */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 font-mono">
          <LogoMark />
          <span className="font-bold text-lg tracking-tight text-[var(--color-ink)]">
            citeflow<span className="text-[var(--color-signal-green)]">_ai</span>
          </span>
        </Link>

        {/* Links — grouped next to the logo, terminal-style */}
        <div className="hidden md:flex items-center gap-5 lg:gap-7 flex-shrink-0 ml-2">
          {navLinks.map((link) => {
            const active = pathname === link.href || (link.href !== '/' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-mono transition-colors ${
                  active
                    ? 'text-[var(--color-signal-green)]'
                    : 'text-[var(--color-soft-ink)] hover:text-[var(--color-ink)]'
                }`}
              >
                {active && <span aria-hidden="true">▸ </span>}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Wallet — pushed to the far right */}
        <div className="hidden md:flex items-center ml-auto flex-shrink-0">
          {walletSignedIn ? (
            <div className="relative" ref={walletMenuRef}>
              <button
                type="button"
                onClick={() => setIsWalletMenuOpen((v) => !v)}
                aria-expanded={isWalletMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2.5 text-sm text-[var(--color-soft-ink)] font-mono bg-[var(--color-panel-deep)] px-3.5 py-2 border border-[var(--color-border-strong)] rounded-[2px] whitespace-nowrap cursor-pointer hover:border-[var(--color-signal-green)] transition-colors"
              >
                <span className="glow-dot animate-pulse"></span>
                <span>{address.substring(0, 4)}…{address.substring(address.length - 4)}</span>
                {walletBalance && (
                  <>
                    <span className="text-[var(--color-faint)]">·</span>
                    <span className="font-bold text-[var(--color-ink)]">${Number(walletBalance).toFixed(2)} USDT</span>
                  </>
                )}
                <ChevronDown size={13} className={`text-[var(--color-faint)] transition-transform ${isWalletMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isWalletMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+6px)] w-56 bg-[var(--color-panel)] border border-[var(--color-border-strong)] rounded-[2px] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-50 font-mono text-sm overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                    <div className="text-[0.6rem] uppercase tracking-[0.16em] text-[var(--color-faint)] mb-1">connected wallet</div>
                    <div className="text-xs text-[var(--color-soft-ink)] break-all">{address}</div>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleCopy}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[var(--color-ink)] hover:bg-[var(--color-panel-deep)] hover:text-[var(--color-signal-green)] transition-colors text-left"
                  >
                    {isCopied ? <Check size={14} className="text-[var(--color-signal-green)]" /> : <Copy size={14} />}
                    {isCopied ? 'copied!' : 'copy address'}
                  </button>
                  <a
                    role="menuitem"
                    href={`${EXPLORER_TX_URL}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsWalletMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[var(--color-ink)] hover:bg-[var(--color-panel-deep)] hover:text-[var(--color-signal-green)] transition-colors"
                  >
                    <ExternalLink size={14} />
                    view on explorer
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setIsWalletMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[var(--color-rust)] hover:bg-[var(--color-rust)]/10 transition-colors text-left border-t border-[var(--color-border-subtle)]"
                  >
                    <LogOut size={14} />
                    disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="flex items-center gap-2 text-sm font-mono font-bold bg-[var(--color-signal-green)] text-[var(--color-paper)] px-4 py-2 rounded-[2px] hover:brightness-110 transition-all whitespace-nowrap"
            >
              connect_wallet
            </button>
          )}
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="md:hidden ml-auto p-2 text-[var(--color-ink)]"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Nav Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-[var(--color-panel)] border-b border-[var(--color-border-subtle)] px-6 py-4 flex flex-col gap-4 shadow-lg z-40">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-base font-mono text-[var(--color-ink)] py-2"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="h-px w-full bg-[var(--color-border-subtle)] my-2"></div>
          {!walletSignedIn && (
            <button
              onClick={() => {
                setIsOpen(false);
                setIsWalletModalOpen(true);
              }}
              className="flex items-center gap-2 text-base font-mono font-bold text-[var(--color-signal-green)] py-2 text-left"
            >
              <LogIn size={18} />
              connect_wallet
            </button>
          )}

          {walletSignedIn && (
            <>
              <div className="h-px w-full bg-[var(--color-border-subtle)] my-2"></div>
              <div className="flex flex-col gap-3 py-2">
                <div className="text-xs uppercase tracking-wider font-bold font-mono text-[var(--color-faint)]">Connected Wallet</div>
                <div className="flex items-center justify-between bg-[var(--color-panel-deep)] px-3 py-2 border border-[var(--color-border-strong)] rounded-[2px]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-mono text-sm text-[var(--color-soft-ink)]">
                      <span className="glow-dot animate-pulse"></span>
                      {address.substring(0, 6)}...{address.substring(address.length - 4)}
                    </div>
                    {walletBalance && (
                      <div className="font-bold font-mono text-[var(--color-ink)]">${Number(walletBalance).toFixed(2)} USDT</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-l border-[var(--color-border-subtle)] pl-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="p-2 hover:text-[var(--color-signal-green)] rounded transition-colors"
                      title="Copy Address"
                    >
                      {isCopied ? <Check size={16} className="text-[var(--color-signal-green)]" /> : <Copy size={16} />}
                    </button>
                    <a
                      href={`${EXPLORER_TX_URL}/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:text-[var(--color-signal-green)] rounded transition-colors"
                      title="View on Explorer"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="p-2 hover:text-[var(--color-rust)] rounded transition-colors"
                      title="Disconnect Wallet"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSuccess={() => {
          setIsWalletModalOpen(false);
          // The sign-in API route sets the Supabase session cookie server-side,
          // which the client SDK's onAuthStateChange doesn't pick up on its own —
          // refresh so the server-rendered user context (and this nav) updates
          // immediately instead of lagging behind.
          router.refresh();
        }}
      />
    </nav>
  );
}
