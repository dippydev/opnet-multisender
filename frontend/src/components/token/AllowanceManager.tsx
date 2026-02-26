import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  RefreshCw,
  XCircle,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  JSONRpcProvider,
  getContract,
  OP_20_ABI,
  type IOP20Contract,
} from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { useRecipientStore } from '../../store/recipientStore';
import { useWallet } from '../../hooks/useWallet';
import { RPC_URL, MULTISENDER_CONTRACT_ADDRESS } from '../../config/constants';
import { formatBalance } from './BalanceDisplay';

type RevokeStatus = 'idle' | 'revoking' | 'revoked' | 'error';

export default function AllowanceManager() {
  const { t } = useTranslation();
  const { address } = useWallet();
  const { selectedToken, sendMode } = useRecipientStore();

  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [revokeStatus, setRevokeStatus] = useState<RevokeStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchAllowance = useCallback(async () => {
    if (
      !selectedToken?.address ||
      !address ||
      !MULTISENDER_CONTRACT_ADDRESS ||
      sendMode === 'btc'
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new JSONRpcProvider({
        url: RPC_URL,
        network: networks.opnetTestnet,
      });

      const tokenAddr = await provider.getPublicKeyInfo(
        selectedToken.address,
        true,
      );

      let senderAddr;
      try {
        senderAddr = await provider.getPublicKeyInfo(address, false);
      } catch {
        senderAddr = await provider.getPublicKeyInfo(address, true);
      }

      const spenderAddr = await provider.getPublicKeyInfo(
        MULTISENDER_CONTRACT_ADDRESS,
        true,
      );

      const token = getContract<IOP20Contract>(
        tokenAddr,
        OP_20_ABI,
        provider,
        networks.opnetTestnet,
        senderAddr,
      );

      const result = await token.allowance(senderAddr, spenderAddr);
      setAllowance(result.properties.remaining);
    } catch (err) {
      console.error('Failed to fetch allowance:', err);
      setError(t('allowance.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [selectedToken, address, sendMode, t]);

  // Fetch allowance on mount and when token/address changes
  useEffect(() => {
    if (sendMode === 'btc' || !MULTISENDER_CONTRACT_ADDRESS) return;
    void fetchAllowance();
  }, [fetchAllowance, sendMode]);

  const handleRevoke = useCallback(async () => {
    if (
      !selectedToken?.address ||
      !address ||
      !MULTISENDER_CONTRACT_ADDRESS ||
      !allowance ||
      allowance === 0n
    ) {
      return;
    }

    setRevokeStatus('revoking');
    setError(null);

    try {
      const provider = new JSONRpcProvider({
        url: RPC_URL,
        network: networks.opnetTestnet,
      });

      const tokenAddr = await provider.getPublicKeyInfo(
        selectedToken.address,
        true,
      );

      let senderAddr;
      try {
        senderAddr = await provider.getPublicKeyInfo(address, false);
      } catch {
        senderAddr = await provider.getPublicKeyInfo(address, true);
      }

      const spenderAddr = await provider.getPublicKeyInfo(
        MULTISENDER_CONTRACT_ADDRESS,
        true,
      );

      const token = getContract<IOP20Contract>(
        tokenAddr,
        OP_20_ABI,
        provider,
        networks.opnetTestnet,
        senderAddr,
      );

      // Decrease allowance to zero
      const simulation = await token.decreaseAllowance(spenderAddr, allowance);

      if (simulation.revert) {
        throw new Error(simulation.revert);
      }

      await simulation.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: address,
        maximumAllowedSatToSpend: 100_000n,
        network: networks.opnetTestnet,
      });

      setAllowance(0n);
      setRevokeStatus('revoked');

      // Reset status after a short delay
      setTimeout(() => setRevokeStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to revoke allowance:', err);
      setError(
        err instanceof Error ? err.message : t('allowance.revokeError'),
      );
      setRevokeStatus('error');
    }
  }, [selectedToken, address, allowance, t]);

  // Don't render for BTC mode or if no contract address
  if (sendMode === 'btc' || !MULTISENDER_CONTRACT_ADDRESS) return null;

  const decimals = selectedToken?.decimals ?? 18;
  const symbol = selectedToken?.symbol ?? '';
  const hasAllowance = allowance !== null && allowance > 0n;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--color-accent)]" />
          <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
            {t('allowance.title')}
          </h4>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => void fetchAllowance()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          {t('allowance.refresh')}
        </button>
      </div>

      {/* Current allowance display */}
      <div className="mb-3 rounded-md bg-[var(--color-bg)] p-3">
        <div className="text-xs text-[var(--color-text-muted)]">
          {t('allowance.currentAllowance')}
        </div>
        <div className="mt-1 font-mono text-sm font-medium text-[var(--color-text-primary)]">
          {loading ? (
            <span className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('allowance.loading')}
            </span>
          ) : allowance !== null ? (
            `${formatBalance(allowance, decimals)} ${symbol}`
          ) : (
            <span className="text-[var(--color-text-muted)]">—</span>
          )}
        </div>
      </div>

      {/* Revoke button */}
      {hasAllowance && revokeStatus !== 'revoked' && (
        <button
          type="button"
          onClick={() => void handleRevoke()}
          disabled={revokeStatus === 'revoking'}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 px-4 py-2.5 text-sm font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-error)]/10 disabled:opacity-50"
        >
          {revokeStatus === 'revoking' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('allowance.revoking')}
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              {t('allowance.revoke')}
            </>
          )}
        </button>
      )}

      {/* Revoked confirmation */}
      {revokeStatus === 'revoked' && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-2.5 text-sm text-[var(--color-success)]">
          <Check className="h-4 w-4" />
          {t('allowance.revoked')}
        </div>
      )}

      {/* No allowance */}
      {allowance !== null && allowance === 0n && revokeStatus !== 'revoked' && (
        <div className="text-center text-xs text-[var(--color-text-muted)]">
          {t('allowance.noAllowance')}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-2.5 text-xs text-[var(--color-error)]">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
