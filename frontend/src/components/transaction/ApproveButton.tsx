import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
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

type ApprovalStatus =
  | 'idle'
  | 'checking'
  | 'sufficient'
  | 'needed'
  | 'approving'
  | 'confirmed'
  | 'error';

/** Convert human-readable amount string to bigint with token decimals */
function parseAmountToBigInt(amount: string, decimals: number): bigint {
  const trimmed = amount.trim();
  if (!trimmed) return 0n;
  const num = Number(trimmed);
  if (isNaN(num) || num <= 0) return 0n;

  const parts = trimmed.split('.');
  const whole = parts[0] || '0';
  let frac = parts[1] || '';
  frac = frac.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac);
}

interface ApproveButtonProps {
  onStatusChange: (ready: boolean) => void;
}

export default function ApproveButton({ onStatusChange }: ApproveButtonProps) {
  const { t } = useTranslation();
  const { address } = useWallet();
  const { selectedToken, recipients, sendMode } = useRecipientStore();

  const [status, setStatus] = useState<ApprovalStatus>('idle');
  const [currentAllowance, setCurrentAllowance] = useState<bigint>(0n);
  const [error, setError] = useState<string | null>(null);

  // Total amount needed in token's smallest unit
  const totalNeeded = useMemo(() => {
    if (!selectedToken || selectedToken.isBTC) return 0n;
    let sum = 0n;
    for (const r of recipients) {
      sum += parseAmountToBigInt(r.amount, selectedToken.decimals);
    }
    return sum;
  }, [recipients, selectedToken]);

  // Notify parent of readiness
  useEffect(() => {
    onStatusChange(status === 'sufficient' || status === 'confirmed');
  }, [status, onStatusChange]);

  // BTC mode: always ready
  useEffect(() => {
    if (sendMode === 'btc') {
      setStatus('sufficient');
    }
  }, [sendMode]);

  // Check current allowance
  const checkAllowance = useCallback(async () => {
    if (
      !selectedToken?.address ||
      !address ||
      sendMode === 'btc' ||
      !MULTISENDER_CONTRACT_ADDRESS
    ) {
      return;
    }

    setStatus('checking');
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
      const allowance = result.properties.remaining;
      setCurrentAllowance(allowance);

      if (allowance >= totalNeeded) {
        setStatus('sufficient');
      } else {
        setStatus('needed');
      }
    } catch (err) {
      console.error('Failed to check allowance:', err);
      setError(t('review.allowanceCheckFailed'));
      setStatus('error');
    }
  }, [selectedToken, address, sendMode, totalNeeded, t]);

  // Check allowance on mount and when deps change
  useEffect(() => {
    if (sendMode === 'btc') return;
    void checkAllowance();
  }, [checkAllowance, sendMode]);

  // Approve (increaseAllowance)
  const handleApprove = useCallback(async () => {
    if (
      !selectedToken?.address ||
      !address ||
      !MULTISENDER_CONTRACT_ADDRESS
    ) {
      return;
    }

    setStatus('approving');
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

      // Calculate how much more allowance we need
      const increaseAmount = totalNeeded - currentAllowance;

      // Simulate first
      const simulation = await token.increaseAllowance(
        spenderAddr,
        increaseAmount,
      );

      if (simulation.revert) {
        throw new Error(simulation.revert);
      }

      // Send transaction (OPWallet handles signing on frontend)
      await simulation.sendTransaction({
        signer: null,
        mldsaSigner: null,
        refundTo: address,
        maximumAllowedSatToSpend: 100_000n,
        network: networks.opnetTestnet,
      });

      setCurrentAllowance(totalNeeded);
      setStatus('confirmed');
      toast.success(t('toast.approvalSuccess'));
    } catch (err) {
      console.error('Approval failed:', err);
      setError(
        err instanceof Error ? err.message : t('review.approvalFailed'),
      );
      setStatus('error');
      toast.error(t('toast.approvalFailed'));
    }
  }, [selectedToken, address, totalNeeded, currentAllowance, t]);

  // BTC mode: no approval needed
  if (sendMode === 'btc') {
    return null;
  }

  // No contract address configured
  if (!MULTISENDER_CONTRACT_ADDRESS) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 p-4">
        <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
        <span className="text-sm text-[var(--color-warning)]">
          {t('review.noContractAddress')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Checking / Idle */}
      {(status === 'idle' || status === 'checking') && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">
            {t('review.checkingAllowance')}
          </span>
        </div>
      )}

      {/* Already sufficient */}
      {status === 'sufficient' && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-4">
          <ShieldCheck className="h-4 w-4 text-[var(--color-success)]" />
          <span className="text-sm text-[var(--color-success)]">
            {t('review.allowanceSufficient')}
          </span>
        </div>
      )}

      {/* Approval confirmed */}
      {status === 'confirmed' && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-4">
          <Check className="h-4 w-4 text-[var(--color-success)]" />
          <span className="text-sm text-[var(--color-success)]">
            {t('review.approvalConfirmed')}
          </span>
        </div>
      )}

      {/* Needs approval */}
      {status === 'needed' && (
        <button
          type="button"
          onClick={() => void handleApprove()}
          className="w-full rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-6 py-3 font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/20"
        >
          {t('review.approveToken', { symbol: selectedToken?.symbol })}
        </button>
      )}

      {/* Approving in progress */}
      {status === 'approving' && (
        <button
          type="button"
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-6 py-3 font-medium text-[var(--color-accent)] opacity-70"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('review.approving')}
        </button>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4 text-sm text-[var(--color-error)]">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void checkAllowance()}
            className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
          >
            {t('review.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
