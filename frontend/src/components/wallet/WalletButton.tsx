import { useTranslation } from 'react-i18next';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
          <span className="text-xs font-mono text-[var(--color-text-secondary)]">
            {truncateAddress(address)}
          </span>
          {balance !== null && !balanceLoading && (
            <span className="text-xs font-mono text-[var(--color-text-muted)] hidden sm:inline">
              ({formatSats(balance)} BTC)
            </span>
          )}
        </div>
        <button
          onClick={disconnect}
          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:bg-[var(--color-bg-card)] transition-colors cursor-pointer"
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
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {connecting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Wallet className="w-4 h-4" />
      )}
      {connecting ? t('wallet.connecting') : t('wallet.connect')}
    </button>
  );
}
