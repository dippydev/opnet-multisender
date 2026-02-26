import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet';

export function NetworkBadge() {
  const { t } = useTranslation();
  const { isConnected, network } = useWallet();

  if (!isConnected) return null;

  const isTestnet = network === 'testnet';

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isTestnet
          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
          : 'bg-green-500/10 text-green-400 border border-green-500/20'
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          isTestnet ? 'bg-yellow-400' : 'bg-green-400'
        }`}
      />
      {isTestnet ? t('wallet.testnet') : t('wallet.mainnet')}
    </div>
  );
}
