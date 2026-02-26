import { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Users, ArrowRight, Layers, Fuel, RefreshCw, AlertTriangle, Loader2, FlaskConical, CheckCircle, XCircle } from 'lucide-react';
import { useRecipientStore } from '../../store/recipientStore';
import { formatBalance } from '../token/BalanceDisplay';
import { MAX_RECIPIENTS_PER_BATCH } from '../../config/constants';
import { useGasEstimate } from '../../hooks/useGasEstimate';
import { useMultiSender } from '../../hooks/useMultiSender';

export default function ReviewCard() {
  const { t } = useTranslation();
  const { selectedToken, recipients, sendMode } = useRecipientStore();
  const {
    totalSats,
    perBatchSats,
    batchCount: gasBatchCount,
    estimating,
    error: gasError,
    estimateGas,
  } = useGasEstimate();
  const { simulateSend, simulating, simulationResults } = useMultiSender();

  const totalAmount = useMemo(() => {
    let sum = 0;
    for (const r of recipients) {
      const num = Number(r.amount);
      if (!isNaN(num) && num > 0) {
        sum += num;
      }
    }
    return sum;
  }, [recipients]);

  const batchCount = Math.ceil(
    recipients.length / MAX_RECIPIENTS_PER_BATCH,
  );

  // Auto-estimate gas when review card mounts or recipients change
  useEffect(() => {
    void estimateGas();
  }, [estimateGas]);

  if (!selectedToken) return null;

  return (
    <div className="border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div className="p-6 sm:p-8">
        <h3 className="mb-6 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
          {t('review.title')}
        </h3>

        <div className="space-y-4">
          {/* Token */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
              <Coins className="h-3.5 w-3.5" />
              {t('review.token')}
            </div>
            <div className="text-sm font-bold text-[var(--color-text-primary)]">
              {selectedToken.name} ({selectedToken.symbol})
            </div>
          </div>

          {/* Send mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
              <ArrowRight className="h-3.5 w-3.5" />
              {t('review.mode')}
            </div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              {sendMode === 'btc' ? t('review.modeBTC') : t('review.modeOP20')}
            </div>
          </div>

          {/* Recipients count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
              <Users className="h-3.5 w-3.5" />
              {t('review.recipients')}
            </div>
            <div className="text-sm font-mono font-bold text-[var(--color-text-primary)]">
              {String(recipients.length).padStart(2, '0')}
            </div>
          </div>

          {/* Batches (show only if > 1) */}
          {batchCount > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                <Layers className="h-3.5 w-3.5" />
                {t('review.batches')}
              </div>
              <div className="text-sm font-medium text-[var(--color-text-primary)]">
                {t('review.batchesCount', {
                  count: batchCount,
                  max: MAX_RECIPIENTS_PER_BATCH,
                })}
              </div>
            </div>
          )}

          {/* Total amount */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                {t('review.totalAmount')}
              </span>
              <span className="font-mono text-xl font-bold text-[var(--color-accent)]">
                {totalAmount.toLocaleString(undefined, {
                  maximumFractionDigits: 18,
                })}{' '}
                {selectedToken.symbol}
              </span>
            </div>
          </div>

          {/* Gas estimate */}
          <div className="border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                <Fuel className="h-3.5 w-3.5" />
                {t('gas.title')}
              </div>
              <button
                onClick={() => void estimateGas()}
                disabled={estimating}
                className="text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)] disabled:opacity-50"
                title={t('gas.refresh')}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${estimating ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-3">
              {estimating ? (
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('gas.estimating')}
                </div>
              ) : gasError ? (
                <div className="flex items-center gap-1.5 text-xs text-[var(--color-error)]">
                  <AlertTriangle className="h-3 w-3" />
                  {t('gas.estimationFailed')}
                </div>
              ) : totalSats > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t('gas.estimatedCost')}
                    </span>
                    <span className="font-mono text-sm font-bold text-[var(--color-text-primary)]">
                      {totalSats.toLocaleString()} {t('gas.sats')}
                    </span>
                  </div>
                  {gasBatchCount > 1 && perBatchSats > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {sendMode === 'btc'
                          ? t('gas.perTransaction')
                          : t('gas.perBatch')}
                      </span>
                      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                        ~{perBatchSats.toLocaleString()} {t('gas.sats')}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {t('gas.unavailable')}
                </span>
              )}
            </div>
          </div>

          {/* Simulation dry run */}
          <div className="border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                <FlaskConical className="h-3.5 w-3.5" />
                {t('simulation.title')}
              </div>
              <button
                onClick={() => void simulateSend()}
                disabled={simulating}
                className="flex items-center gap-1.5 border border-[var(--color-border)] px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('simulation.simulating')}
                  </>
                ) : (
                  t('simulation.simulate')
                )}
              </button>
            </div>

            {simulationResults && (() => {
              const allPassed = simulationResults.every((r) => r.success);
              const anyFailed = simulationResults.some((r) => !r.success);
              const totalGas = simulationResults.reduce(
                (sum, r) => sum + r.gasUsed,
                0,
              );

              return (
                <div className="mt-3 space-y-2">
                  {/* Overall verdict banner */}
                  {allPassed ? (
                    <div className="flex items-center gap-2 bg-[var(--color-success)]/10 px-3 py-2 text-xs font-bold text-[var(--color-success)]">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {t('simulation.passed')}
                    </div>
                  ) : anyFailed && simulationResults.some((r) => r.success) ? (
                    <div className="flex items-center gap-2 bg-[var(--color-warning)]/10 px-3 py-2 text-xs font-bold text-[var(--color-warning)]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('simulation.partialFailed')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-[var(--color-error)]/10 px-3 py-2 text-xs font-bold text-[var(--color-error)]">
                      <XCircle className="h-3.5 w-3.5" />
                      {t('simulation.failed')}
                    </div>
                  )}

                  {/* Per-batch details */}
                  {(simulationResults.length > 1 || anyFailed) &&
                    sendMode !== 'btc' && (
                      <div className="space-y-1">
                        {simulationResults.map((r) => (
                          <div
                            key={r.batchIndex}
                            className="flex items-center justify-between px-2 py-1 text-xs"
                          >
                            <span className="text-[var(--color-text-muted)]">
                              {t('simulation.batch', {
                                index: r.batchIndex + 1,
                              })}
                              <span className="ml-1 opacity-60">
                                ({r.recipientCount})
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              {r.gasUsed > 0 && (
                                <span className="font-mono text-[var(--color-text-muted)]">
                                  {r.gasUsed.toLocaleString()} {t('gas.sats')}
                                </span>
                              )}
                              {r.success ? (
                                <CheckCircle className="h-3 w-3 text-[var(--color-success)]" />
                              ) : (
                                <XCircle className="h-3 w-3 text-[var(--color-error)]" />
                              )}
                            </div>
                          </div>
                        ))}
                        {simulationResults
                          .filter((r) => r.revertReason)
                          .map((r) => (
                            <div
                              key={`err-${r.batchIndex}`}
                              className="bg-[var(--color-error)]/5 px-2 py-1.5 text-xs text-[var(--color-error)]"
                            >
                              <span className="font-bold">
                                {t('simulation.batch', {
                                  index: r.batchIndex + 1,
                                })}
                                :
                              </span>{' '}
                              {r.revertReason}
                            </div>
                          ))}
                      </div>
                    )}

                  {/* Total gas summary */}
                  {totalGas > 0 && (
                    <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-text-muted)]">
                      <span>{t('simulation.totalGas')}</span>
                      <span className="font-mono font-bold">
                        {totalGas.toLocaleString()} {t('gas.sats')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Balance reminder */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
              {t('review.yourBalance')}
            </span>
            <span className="font-mono font-bold text-[var(--color-text-primary)]">
              {formatBalance(selectedToken.balance, selectedToken.decimals)}{' '}
              {selectedToken.symbol}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
