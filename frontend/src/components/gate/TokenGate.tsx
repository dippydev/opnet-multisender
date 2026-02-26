import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  ShieldOff,
} from 'lucide-react';
import { usePillGate } from '../../hooks/usePillGate';
import { useWallet } from '../../hooks/useWallet';
import {
  PILL_TOKEN_ADDRESS,
  PILL_REQUIRED_AMOUNT,
  MOTOSWAP_URL,
} from '../../config/constants';

interface TokenGateProps {
  children: ReactNode;
}

export default function TokenGate({ children }: TokenGateProps) {
  const { t } = useTranslation();
  const { address, isConnected } = useWallet();
  const {
    balanceFormatted,
    sufficient,
    deficit,
    loading,
    error,
    bypassed,
    toggleBypass,
    refresh,
  } = usePillGate(address);

  // Not connected — let the wizard handle connection flow
  if (!isConnected) {
    return <>{children}</>;
  }

  // Bypass active — pass through
  if (bypassed) {
    return (
      <div>
        {/* Bypass indicator bar */}
        <div className="mb-4 flex items-center justify-between border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-4 py-2">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-warning)]">
            <ShieldOff className="h-3.5 w-3.5" />
            {t('gate.bypassActive')}
          </div>
          <button
            type="button"
            onClick={toggleBypass}
            className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-warning)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            {t('gate.disableBypass')}
          </button>
        </div>
        {children}
      </div>
    );
  }

  // Loading balance
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent)]" />
        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
          {t('gate.checking')}
        </p>
      </div>
    );
  }

  // Sufficient balance — pass through
  if (sufficient) {
    return <>{children}</>;
  }

  // Insufficient balance — show gate
  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div className="p-8 sm:p-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-[var(--color-border)]">
            <ShieldCheck className="h-7 w-7 text-[var(--color-accent)]" />
          </div>
          <h2 className="text-xl font-black tracking-[-0.02em] uppercase text-[var(--color-text-primary)]">
            {t('gate.title')}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {t('gate.description', { amount: PILL_REQUIRED_AMOUNT.toLocaleString() })}
          </p>
        </div>

        {/* Balance card */}
        <div className="mx-auto max-w-md space-y-4">
          <div className="border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
            <div className="space-y-3">
              {/* Current balance */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('gate.yourBalance')}
                </span>
                <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                  {balanceFormatted} PILL
                </span>
              </div>

              {/* Required */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                  {t('gate.required')}
                </span>
                <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                  {PILL_REQUIRED_AMOUNT.toLocaleString()} PILL
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-[var(--color-border)]" />

              {/* Deficit */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-error)]">
                  {t('gate.deficit')}
                </span>
                <span className="font-mono text-sm font-bold text-[var(--color-error)]">
                  {deficit.toLocaleString(undefined, { maximumFractionDigits: 2 })} PILL
                </span>
              </div>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-error)]">
              <AlertTriangle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}

          {/* Swap widget */}
          <div className="border border-[var(--color-border)] bg-[var(--color-bg)] p-6">
            <h3 className="mb-3 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
              {t('gate.swapTitle')}
            </h3>
            <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
              {t('gate.swapDescription')}
            </p>

            {/* Token address (copyable) */}
            <div className="mb-4 flex items-center justify-between bg-[var(--color-bg-card)] px-3 py-2">
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                PILL
              </span>
              <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                {PILL_TOKEN_ADDRESS.slice(0, 12)}...{PILL_TOKEN_ADDRESS.slice(-6)}
              </span>
            </div>

            {/* Swap link */}
            <a
              href={MOTOSWAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 bg-[var(--color-accent)] px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase text-black transition-opacity hover:opacity-90"
            >
              {t('gate.swapButton')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-between pt-2">
            {/* Refresh balance */}
            <button
              type="button"
              onClick={() => void refresh()}
              className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
            >
              <RefreshCw className="h-3 w-3" />
              {t('gate.refresh')}
            </button>

            {/* Bypass button */}
            <button
              type="button"
              onClick={toggleBypass}
              className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]/50 transition-colors hover:text-[var(--color-text-secondary)]"
            >
              {t('gate.bypass')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
