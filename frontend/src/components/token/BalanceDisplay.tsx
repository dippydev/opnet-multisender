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
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-border)]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
      <span>{t('token.balance')}:</span>
      <span className="font-mono font-medium text-[var(--color-text-primary)]">
        {formatBalance(balance, decimals)}
      </span>
      <span className="text-[var(--color-text-muted)]">{symbol}</span>
    </div>
  );
}

export { formatBalance };
