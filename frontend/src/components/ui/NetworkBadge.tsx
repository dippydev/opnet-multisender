import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet';

export function NetworkBadge() {
  const { t } = useTranslation();
  const { isConnected, network } = useWallet();

  if (!isConnected) return null;

  const isTestnet = network === 'testnet';

  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1 border border-[var(--color-border)] rounded-full">
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isTestnet ? 'bg-[var(--color-success)]' : 'bg-[var(--color-success)]'
        }`}
      />
      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)]">
        {isTestnet ? t('wallet.testnet') : t('wallet.mainnet')}
      </span>
    </div>
  );
}
