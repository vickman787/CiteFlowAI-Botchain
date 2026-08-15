'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage, useSwitchChain } from 'wagmi';
import { botChain } from '@/lib/chains/botChain';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (walletAddress: string) => void;
}

type ModalState = 'CHOOSE_CONNECTOR' | 'CONNECTING' | 'WRONG_CHAIN' | 'SIGNING' | 'COMPLETED';

export default function WalletModal({ isOpen, onClose, onSuccess }: WalletModalProps) {
  const [modalState, setModalState] = useState<ModalState>('CHOOSE_CONNECTOR');
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    // The browser wallet can already be connected here — e.g. MetaMask
    // auto-reconnects to any origin it previously authorized, without a
    // prompt. That only means a wallet is connected, not that this address
    // has completed our sign-in-with-wallet step, so skip straight past
    // connector selection into the chain check / signature.
    if (isConnected && address) {
      if (chainId !== botChain.id) {
        setModalState('WRONG_CHAIN');
      } else {
        signInWithWallet(address);
      }
    } else {
      setModalState('CHOOSE_CONNECTOR');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const errMessage = (err: unknown): string =>
    typeof err === 'string' ? err : (err as { shortMessage?: string; message?: string })?.shortMessage
      || (err as { message?: string })?.message
      || 'Something went wrong';

  const signInWithWallet = async (walletAddress: string) => {
    setModalState('SIGNING');
    try {
      const message = `Sign in to CiteFlowAI\n\nAddress: ${walletAddress.toLowerCase()}\nTimestamp: ${new Date().toISOString()}\nNonce: ${crypto.randomUUID()}`;
      const signature = await signMessageAsync({ message });

      const res = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, message, signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sign-in failed');

      setModalState('COMPLETED');
      onSuccess(data.walletAddress);
    } catch (err) {
      setError(errMessage(err));
      disconnect();
      setModalState('CHOOSE_CONNECTOR');
    }
  };

  const handleConnect = async (connector: (typeof connectors)[number]) => {
    setError(null);
    setModalState('CONNECTING');
    try {
      const result = await connectAsync({ connector, chainId: botChain.id });
      const connectedAddress = result.accounts[0];

      if (result.chainId !== botChain.id) {
        setModalState('WRONG_CHAIN');
        try {
          await switchChainAsync({ chainId: botChain.id });
        } catch {
          // Leave the user on the WRONG_CHAIN screen with manual add-network instructions.
          return;
        }
      }

      await signInWithWallet(connectedAddress);
    } catch (err) {
      setError(errMessage(err));
      setModalState('CHOOSE_CONNECTOR');
    }
  };

  const handleRetrySwitch = async () => {
    try {
      await switchChainAsync({ chainId: botChain.id });
      if (address) await signInWithWallet(address);
    } catch (err) {
      setError(errMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card-panel w-full max-w-md p-6 shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-soft-ink)] hover:text-[var(--color-ink)]"
        >
          ✕
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1">
            {modalState === 'CHOOSE_CONNECTOR' ? 'Connect Wallet' :
             modalState === 'CONNECTING' ? 'Connecting…' :
             modalState === 'WRONG_CHAIN' ? `Switch to ${botChain.name}` :
             modalState === 'SIGNING' ? 'Verify Ownership' : 'Connected!'}
          </h2>
          <p className="text-sm text-[var(--color-soft-ink)]">
            {modalState === 'CHOOSE_CONNECTOR' && 'Connect any EVM wallet to register sources and fund research.'}
            {modalState === 'SIGNING' && 'Sign a message in your wallet to prove you own this address. This is free — no gas, no funds move.'}
            {modalState === 'WRONG_CHAIN' && `Your wallet needs to switch to ${botChain.name}.`}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[var(--color-rust)]/10 text-[var(--color-rust)] text-sm rounded-[2px] border border-[var(--color-rust)]">
            {error}
          </div>
        )}

        {modalState === 'CHOOSE_CONNECTOR' && (
          <div className="space-y-2">
            {connectors.length === 0 && (
              <p className="text-sm text-[var(--color-soft-ink)]">
                No wallet extension detected. Install MetaMask or BOT Wallet and reload the page.
              </p>
            )}
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => handleConnect(connector)}
                className="btn btn-primary w-full"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
        )}

        {(modalState === 'CONNECTING' || modalState === 'SIGNING') && (
          <div className="py-8 flex flex-col items-center justify-center text-[var(--color-soft-ink)]">
             <svg className="animate-spin h-8 w-8 mb-4 text-[var(--color-signal-green)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{modalState === 'SIGNING' ? 'Waiting for signature...' : 'Waiting for wallet...'}</span>
          </div>
        )}

        {modalState === 'WRONG_CHAIN' && (
          <div>
            <button onClick={handleRetrySwitch} disabled={isSwitching} className="btn btn-primary w-full mb-4">
              {isSwitching ? 'Switching…' : 'Switch network'}
            </button>
            <p className="text-xs text-[var(--color-soft-ink)] mb-2">Some wallets (e.g. Rabby) don&apos;t support switching networks programmatically — add {botChain.name} manually instead:</p>
            <div className="font-mono text-xs bg-[var(--color-panel-deep)] p-3 rounded border border-[var(--color-border-subtle)] space-y-1">
              <div>Chain ID: {botChain.id}</div>
              <div>RPC: {botChain.rpcUrls.default.http[0]}</div>
              <div>Currency: {botChain.nativeCurrency.symbol}</div>
              <div>Explorer: {botChain.blockExplorers.default.url}</div>
            </div>
          </div>
        )}

        {modalState === 'COMPLETED' && (
           <div className="py-6 flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-[var(--color-signal-green)]/15 text-[var(--color-signal-green)] rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
               </div>
               <h3 className="font-medium text-lg">Wallet Connected</h3>
               <button onClick={onClose} className="mt-6 btn btn-highlight w-full">
                   Start Using CiteFlow
               </button>
           </div>
        )}
      </div>
    </div>
  );
}
