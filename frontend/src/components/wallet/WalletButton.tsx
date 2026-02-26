import { useTranslation } from 'react-i18next';
import { LogOut, Loader2 } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function formatSats(sats: bigint): string {
  const btc = Number(sats) / 1e8;
  return btc.toFixed(6);
}

export function WalletButton() {
  const { t } = useTranslation();
  const {
    address,
    isConnected,
    connecting,
    balance,
    balanceLoading,
    connect,
    disconnect,
  } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
          <span className="text-[11px] font-mono tracking-tight text-[var(--color-text-secondary)]">
            {truncateAddress(address)}
          </span>
          {balance !== null && !balanceLoading && (
            <span className="text-[11px] font-mono text-[var(--color-text-muted)] hidden sm:inline">
              ({formatSats(balance)} BTC)
            </span>
          )}
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
          title={t('wallet.disconnect')}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] hover:opacity-90 text-black text-[11px] font-bold tracking-[0.15em] uppercase transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {connecting ? t('wallet.connecting') : t('wallet.connect')}
    </button>
  );
}
