import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';

interface AddressDisplayProps {
  address: string;
  maxLength?: number;
}

export default function AddressDisplay({
  address,
  maxLength = 16,
}: AddressDisplayProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const truncated =
    address.length > maxLength
      ? `${address.slice(0, maxLength / 2 + 2)}...${address.slice(-(maxLength / 2 - 2))}`
      : address;

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void navigator.clipboard.writeText(address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [address],
  );

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm" title={address}>
        {truncated}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
        title={t('common.copyAddress')}
      >
        {copied ? (
          <Check className="h-3 w-3 text-[var(--color-success)]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}
