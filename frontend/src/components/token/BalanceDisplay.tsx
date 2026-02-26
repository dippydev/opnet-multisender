import { useTranslation } from 'react-i18next';

interface BalanceDisplayProps {
  balance: bigint;
  decimals: number;
  symbol: string;
  loading?: boolean;
}

function formatBalance(balance: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = balance / divisor;
  const remainder = balance % divisor;

  if (remainder === 0n) {
    return whole.toLocaleString();
  }

  const remainderStr = remainder.toString().padStart(decimals, '0');
  // Show up to 6 decimal places, trim trailing zeros
  const trimmed = remainderStr.slice(0, 6).replace(/0+$/, '');
  if (!trimmed) {
    return whole.toLocaleString();
  }
  return `${whole.toLocaleString()}.${trimmed}`;
}

export default function BalanceDisplay({
  balance,
  decimals,
  symbol,
  loading,
}: BalanceDisplayProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-24 animate-pulse bg-[var(--color-border)]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
        {t('token.balance')}
      </span>
      <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
        {formatBalance(balance, decimals)}
      </span>
      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
        {symbol}
      </span>
    </div>
  );
}

export { formatBalance };
