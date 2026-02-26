import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Shield,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Percent,
  PauseCircle,
  PlayCircle,
  UserCog,
  AlertTriangle,
} from 'lucide-react';
import { networks } from '@btc-vision/bitcoin';
import { MULTISENDER_CONTRACT_ADDRESS } from '../config/constants';
import {
  createProvider,
  resolveAddress,
  getTypedContract,
} from '../lib/opnet';
import {
  MultiSenderAbi,
  type IMultiSender,
} from '../config/multisender-abi';
import { useWallet } from '../hooks/useWallet';
import { useIsOwner } from '../hooks/useIsOwner';

interface ContractState {
  owner: string;
  fee: bigint;
  paused: boolean;
  gateEnabled: boolean;
  gateToken: string;
  gateAmount: bigint;
}

export default function Admin() {
  const { t } = useTranslation();
  const { address, isConnected } = useWallet();
  const { isOwner, checking: ownerChecking } = useIsOwner();

  const [state, setState] = useState<ContractState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [newFee, setNewFee] = useState('');
  const [newOwnerAddr, setNewOwnerAddr] = useState('');
  const [newGateToken, setNewGateToken] = useState('');
  const [newGateAmount, setNewGateAmount] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchState = useCallback(async () => {
    if (!MULTISENDER_CONTRACT_ADDRESS) {
      setError(t('review.noContractAddress'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = createProvider();
      const contractAddr = await resolveAddress(
        provider,
        MULTISENDER_CONTRACT_ADDRESS,
        true,
      );

      // Use contract address as sender for read-only calls
      const senderAddr = address
        ? await resolveAddress(provider, address, false).catch(() => contractAddr)
        : contractAddr;

      const contract = getTypedContract<IMultiSender>(
        contractAddr,
        MultiSenderAbi,
        provider,
        senderAddr,
      );

      const [feeRes, ownerRes, pausedRes, gateEnabledRes, gateTokenRes, gateAmountRes] = await Promise.all([
        contract.getFee(),
        contract.getOwner(),
        contract.isPaused(),
        contract.isGateEnabled(),
        contract.getGateToken(),
        contract.getGateAmount(),
      ]);

      const ownerHex = ownerRes.properties.owner
        ? String(ownerRes.properties.owner)
        : '';
      const gateTokenHex = gateTokenRes.properties.token
        ? String(gateTokenRes.properties.token)
        : '';

      setState({
        owner: ownerHex,
        fee: feeRes.properties.fee,
        paused: pausedRes.properties.paused,
        gateEnabled: gateEnabledRes.properties.enabled,
        gateToken: gateTokenHex,
        gateAmount: gateAmountRes.properties.amount,
      });
    } catch (err) {
      console.error('Failed to fetch contract state:', err);
      setError(
        err instanceof Error ? err.message : t('admin.fetchError'),
      );
    } finally {
      setLoading(false);
    }
  }, [address, t]);

  useEffect(() => {
    void fetchState();
  }, [fetchState]);

  const executeAction = useCallback(
    async (
      actionName: string,
      fn: (contract: IMultiSender) => Promise<unknown>,
    ) => {
      if (!address || !MULTISENDER_CONTRACT_ADDRESS) return;

      setActionLoading(actionName);
      try {
        const provider = createProvider();
        const contractAddr = await resolveAddress(
          provider,
          MULTISENDER_CONTRACT_ADDRESS,
          true,
        );
        const senderAddr = await resolveAddress(provider, address, false);
        const contract = getTypedContract<IMultiSender>(
          contractAddr,
          MultiSenderAbi,
          provider,
          senderAddr,
        );

        const simulation = (await fn(contract)) as { revert?: string; sendTransaction: (opts: Record<string, unknown>) => Promise<unknown> };
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

        toast.success(t('admin.actionSuccess', { action: actionName }));
        // Refresh state after a brief delay for UX
        setTimeout(() => void fetchState(), 2000);
      } catch (err) {
        console.error(`Admin action ${actionName} failed:`, err);
        toast.error(
          err instanceof Error ? err.message : t('admin.actionFailed'),
        );
      } finally {
        setActionLoading(null);
      }
    },
    [address, fetchState, t],
  );

  const handleSetFee = useCallback(() => {
    const bps = parseInt(newFee, 10);
    if (isNaN(bps) || bps < 0 || bps > 500) {
      toast.error(t('admin.invalidFee'));
      return;
    }
    void executeAction('setFee', (c) => c.setFee(BigInt(bps)));
  }, [newFee, executeAction, t]);

  const handlePause = useCallback(() => {
    void executeAction('pause', (c) => c.pause());
  }, [executeAction]);

  const handleUnpause = useCallback(() => {
    void executeAction('unpause', (c) => c.unpause());
  }, [executeAction]);

  const handleTransferOwnership = useCallback(() => {
    const addr = newOwnerAddr.trim();
    if (!addr || !addr.startsWith('opt1')) {
      toast.error(t('admin.invalidAddress'));
      return;
    }
    void executeAction('transferOwnership', async (c) => {
      const provider = createProvider();
      const resolved = await resolveAddress(provider, addr, false);
      return c.transferOwnership(resolved);
    });
  }, [newOwnerAddr, executeAction, t]);

  const handleToggleGate = useCallback(() => {
    if (!state) return;
    const newEnabled = !state.gateEnabled;
    void executeAction('setGateEnabled', (c) => c.setGateEnabled(newEnabled));
  }, [state, executeAction]);

  const handleSetGateToken = useCallback(() => {
    const addr = newGateToken.trim();
    if (!addr || !addr.startsWith('opt1')) {
      toast.error(t('admin.invalidTokenAddress'));
      return;
    }
    void executeAction('setGateToken', async (c) => {
      const provider = createProvider();
      const resolved = await resolveAddress(provider, addr, true);
      return c.setGateToken(resolved);
    });
  }, [newGateToken, executeAction, t]);

  const handleSetGateAmount = useCallback(() => {
    const val = newGateAmount.trim();
    if (!val || isNaN(Number(val)) || Number(val) <= 0) {
      toast.error(t('admin.invalidGateAmount'));
      return;
    }
    void executeAction('setGateAmount', (c) => c.setGateAmount(BigInt(val)));
  }, [newGateAmount, executeAction, t]);

  // Still checking ownership — show loader
  if (ownerChecking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="flex items-center justify-center gap-2 py-12 text-[var(--color-text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </div>
    );
  }

  // Not connected or not owner — redirect to home
  if (!isConnected || !isOwner) {
    return <Navigate to="/" replace />;
  }

  // No contract configured
  if (!MULTISENDER_CONTRACT_ADDRESS) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            {t('pages.admin.title')}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {t('pages.admin.description')}
          </p>
        </div>
        <button
          onClick={() => void fetchState()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.refresh')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !state && (
        <div className="flex items-center justify-center gap-2 py-12 text-[var(--color-text-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          {t('admin.loading')}
        </div>
      )}

      {state && (
        <div className="space-y-6">
          {/* Contract info card */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <Shield className="h-5 w-5 text-[var(--color-accent)]" />
              {t('admin.contractState')}
            </h2>

            <div className="space-y-3">
              {/* Contract address */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t('admin.contractAddress')}
                </span>
                <span className="font-mono text-sm text-[var(--color-text-primary)]">
                  {MULTISENDER_CONTRACT_ADDRESS.slice(0, 12)}...
                  {MULTISENDER_CONTRACT_ADDRESS.slice(-6)}
                </span>
              </div>

              {/* Owner */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t('admin.owner')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[var(--color-text-primary)]">
                    {state.owner.slice(0, 10)}...{state.owner.slice(-6)}
                  </span>
                  {isOwner && (
                    <span className="rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-success)]">
                      {t('admin.you')}
                    </span>
                  )}
                </div>
              </div>

              {/* Fee */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t('admin.currentFee')}
                </span>
                <span className="font-mono text-sm text-[var(--color-text-primary)]">
                  {Number(state.fee)} {t('admin.bps')} ({(Number(state.fee) / 100).toFixed(2)}%)
                </span>
              </div>

              {/* Paused status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t('admin.status')}
                </span>
                {state.paused ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-error)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-error)]">
                    <PauseCircle className="h-3 w-3" />
                    {t('admin.paused')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-success)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-success)]">
                    <PlayCircle className="h-3 w-3" />
                    {t('admin.active')}
                  </span>
                )}
              </div>

              {/* Token gate status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {t('admin.tokenGate')}
                </span>
                {state.gateEnabled ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                    <ShieldCheck className="h-3 w-3" />
                    {t('admin.gateOn')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-text-muted)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                    {t('admin.gateOff')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Owner actions */}
          <div className="space-y-4">
              {/* Set Fee */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <Percent className="h-4 w-4 text-[var(--color-accent)]" />
                  {t('admin.setFee')}
                </h3>
                <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                  {t('admin.setFeeDescription')}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    placeholder={t('admin.feePlaceholder')}
                    className="w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {t('admin.bps')}
                  </span>
                  {newFee && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      = {(parseInt(newFee, 10) / 100 || 0).toFixed(2)}%
                    </span>
                  )}
                  <button
                    onClick={handleSetFee}
                    disabled={actionLoading === 'setFee' || !newFee}
                    className="ml-auto flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                  >
                    {actionLoading === 'setFee' && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {t('admin.update')}
                  </button>
                </div>
              </div>

              {/* Pause / Unpause */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  {state.paused ? (
                    <PlayCircle className="h-4 w-4 text-[var(--color-success)]" />
                  ) : (
                    <PauseCircle className="h-4 w-4 text-[var(--color-warning)]" />
                  )}
                  {state.paused ? t('admin.unpauseTitle') : t('admin.pauseTitle')}
                </h3>
                <p className="mb-3 text-xs text-[var(--color-text-muted)]">
                  {state.paused
                    ? t('admin.unpauseDescription')
                    : t('admin.pauseDescription')}
                </p>
                <button
                  onClick={state.paused ? handleUnpause : handlePause}
                  disabled={
                    actionLoading === 'pause' || actionLoading === 'unpause'
                  }
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                    state.paused
                      ? 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/80'
                      : 'bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/80'
                  }`}
                >
                  {(actionLoading === 'pause' ||
                    actionLoading === 'unpause') && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {state.paused ? t('admin.unpause') : t('admin.pause')}
                </button>
              </div>

              {/* Token Gate */}
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
                  {t('admin.tokenGate')}
                </h3>
                <p className="mb-4 text-xs text-[var(--color-text-muted)]">
                  {t('admin.gateDescription')}
                </p>

                <div className="space-y-4">
                  {/* Gate status display + toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                      {t('admin.gateEnabled')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${state.gateEnabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                        {state.gateEnabled ? t('admin.gateOn') : t('admin.gateOff')}
                      </span>
                      <button
                        onClick={handleToggleGate}
                        disabled={actionLoading === 'setGateEnabled'}
                        className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-white transition-colors disabled:opacity-50 ${
                          state.gateEnabled
                            ? 'bg-[var(--color-text-muted)] hover:bg-[var(--color-text-secondary)]'
                            : 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/80'
                        }`}
                      >
                        {actionLoading === 'setGateEnabled' && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        {state.gateEnabled ? t('admin.disableGate') : t('admin.enableGate')}
                      </button>
                    </div>
                  </div>

                  {/* Current gate token */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                      {t('admin.gateToken')}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {state.gateToken
                        ? `${state.gateToken.slice(0, 12)}...${state.gateToken.slice(-6)}`
                        : '—'}
                    </span>
                  </div>

                  {/* Set gate token */}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newGateToken}
                      onChange={(e) => setNewGateToken(e.target.value)}
                      placeholder={t('admin.gateTokenPlaceholder')}
                      className="flex-1 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                    <button
                      onClick={handleSetGateToken}
                      disabled={actionLoading === 'setGateToken' || !newGateToken.trim()}
                      className="flex items-center gap-2 bg-[var(--color-accent)] px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-black transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading === 'setGateToken' && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      {t('admin.updateToken')}
                    </button>
                  </div>

                  {/* Current gate amount */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                      {t('admin.gateAmount')}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {state.gateAmount.toString()} <span className="opacity-50">({t('admin.gateAmountRaw')})</span>
                    </span>
                  </div>

                  {/* Set gate amount */}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={newGateAmount}
                      onChange={(e) => setNewGateAmount(e.target.value)}
                      placeholder={t('admin.gateAmountPlaceholder')}
                      className="w-48 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                    />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t('admin.gateAmountRaw')}
                    </span>
                    <button
                      onClick={handleSetGateAmount}
                      disabled={actionLoading === 'setGateAmount' || !newGateAmount.trim()}
                      className="ml-auto flex items-center gap-2 bg-[var(--color-accent)] px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase text-black transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      {actionLoading === 'setGateAmount' && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      )}
                      {t('admin.updateAmount')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transfer Ownership */}
              <div className="rounded-lg border border-[var(--color-error)]/20 bg-[var(--color-bg-card)] p-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                  <UserCog className="h-4 w-4 text-[var(--color-error)]" />
                  {t('admin.transferOwnership')}
                </h3>
                <p className="mb-3 text-xs text-[var(--color-error)]/70">
                  {t('admin.transferWarning')}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newOwnerAddr}
                    onChange={(e) => setNewOwnerAddr(e.target.value)}
                    placeholder={t('admin.newOwnerPlaceholder')}
                    className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                  />
                  <button
                    onClick={handleTransferOwnership}
                    disabled={
                      actionLoading === 'transferOwnership' ||
                      !newOwnerAddr.trim()
                    }
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-error)]/80 disabled:opacity-50"
                  >
                    {actionLoading === 'transferOwnership' && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    {t('admin.transfer')}
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
