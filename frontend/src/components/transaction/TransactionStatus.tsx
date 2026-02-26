import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  RotateCcw,
  PartyPopper,
  AlertTriangle,
  Plus,
  Download,
} from 'lucide-react';
import { useHistoryStore, deriveStatus } from '../../store/historyStore';
import { useRecipientStore } from '../../store/recipientStore';
import type { QueueEntry } from '../../store/recipientStore';
import { OPSCAN_BASE_URL, MAX_RECIPIENTS_PER_BATCH } from '../../config/constants';
import type { BatchResult } from '../../hooks/useMultiSender';
import { downloadReceipt } from '../../lib/receipt';

export default function TransactionStatus() {
  const { t } = useTranslation();
  const { currentResults, clearCurrentResults } = useHistoryStore();
  const { resetWizard, sendMode, selectedToken, recipients, addToQueue } =
    useRecipientStore();
  const isBTC = sendMode === 'btc';

  const summary = useMemo(() => {
    const confirmed = currentResults.filter(
      (r) => r.status === 'confirmed',
    ).length;
    const failed = currentResults.filter((r) => r.status === 'failed').length;
    const total = currentResults.length;
    return { confirmed, failed, total };
  }, [currentResults]);

  const allConfirmed = summary.confirmed === summary.total && summary.total > 0;
  const allFailed = summary.failed === summary.total && summary.total > 0;
  const hasFailures = summary.failed > 0;

  const confettiFired = useRef(false);
  useEffect(() => {
    if (allConfirmed && !confettiFired.current) {
      confettiFired.current = true;
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        void confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#F7931A', '#FFD700', '#FF6B00'],
        });
        void confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#F7931A', '#FFD700', '#FF6B00'],
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [allConfirmed]);

  const handleSendMore = () => {
    clearCurrentResults();
    resetWizard();
  };

  const handleExportReceipt = () => {
    const symbol =
      selectedToken?.symbol ?? (sendMode === 'btc' ? 'BTC' : 'Unknown');
    downloadReceipt(
      currentResults,
      recipients,
      symbol,
      isBTC,
      MAX_RECIPIENTS_PER_BATCH,
    );
  };

  const handleQueueAnother = () => {
    const totalAmount = recipients.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    const entry: QueueEntry = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      tokenSymbol:
        selectedToken?.symbol ?? (sendMode === 'btc' ? 'BTC' : 'Unknown'),
      tokenAddress: selectedToken?.address ?? null,
      sendMode,
      recipientCount: recipients.length,
      totalAmount: String(totalAmount),
      status: deriveStatus(currentResults),
      txHashes: currentResults
        .filter((r) => r.txHash)
        .map((r) => r.txHash as string),
      addedAt: new Date().toISOString(),
    };
    addToQueue(entry);
    clearCurrentResults();
    resetWizard();
  };

  if (currentResults.length === 0) {
    return (
      <div className="space-y-4">
        {/* Skeleton loading rows */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--color-border)]" />
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
            <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-border)]" />
          </div>
        ))}
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          {t('status.noResults')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div
        className={`rounded-lg border p-6 text-center ${
          allConfirmed
            ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
            : allFailed
              ? 'border-[var(--color-error)]/30 bg-[var(--color-error)]/5'
              : hasFailures
                ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
                : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
        }`}
      >
        <div className="mb-3 flex justify-center">
          {allConfirmed ? (
            <PartyPopper className="h-12 w-12 text-[var(--color-success)]" />
          ) : allFailed ? (
            <XCircle className="h-12 w-12 text-[var(--color-error)]" />
          ) : (
            <AlertTriangle className="h-12 w-12 text-[var(--color-warning)]" />
          )}
        </div>

        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
          {allConfirmed
            ? t('status.allConfirmed')
            : allFailed
              ? t('status.allFailed')
              : t('status.partialSuccess')}
        </h2>

        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {t('status.summary', {
            confirmed: summary.confirmed,
            failed: summary.failed,
            total: summary.total,
          })}
        </p>
      </div>

      {/* Per-batch/recipient results */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
          {t('status.details')}
        </h3>

        {currentResults.map((result) => (
          <ResultRow key={result.batchIndex} result={result} isBTC={isBTC} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleExportReceipt}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-6 py-3 font-medium text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          <Download className="h-4 w-4" />
          {t('receipt.export')}
        </button>
        <button
          type="button"
          onClick={handleQueueAnother}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-accent)] px-6 py-3 font-medium text-[var(--color-accent)] transition-all hover:bg-[var(--color-accent)]/10"
        >
          <Plus className="h-4 w-4" />
          {t('queue.queueAnother')}
        </button>
        <button
          type="button"
          onClick={handleSendMore}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-3 font-medium text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_30px_rgba(247,147,26,0.3)]"
        >
          <RotateCcw className="h-4 w-4" />
          {t('wizard.sendMore')}
        </button>
      </div>
    </div>
  );
}

function ResultRow({
  result,
  isBTC,
}: {
  result: BatchResult;
  isBTC: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        result.status === 'confirmed'
          ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
          : result.status === 'failed'
            ? 'border-[var(--color-error)]/30 bg-[var(--color-error)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
      }`}
    >
      {/* Left: status icon + label */}
      <div className="flex items-center gap-3">
        {result.status === 'confirmed' ? (
          <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
        ) : result.status === 'failed' ? (
          <XCircle className="h-5 w-5 text-[var(--color-error)]" />
        ) : (
          <Clock className="h-5 w-5 text-[var(--color-text-muted)]" />
        )}

        <div>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {isBTC
              ? t('send.recipient', { index: result.batchIndex + 1 })
              : t('send.batch', { index: result.batchIndex + 1 })}
          </span>
          {!isBTC && (
            <span className="ml-2 text-xs text-[var(--color-text-muted)]">
              ({t('send.recipientCount', { count: result.recipientCount })})
            </span>
          )}
          {result.status === 'failed' && result.error && (
            <p className="mt-0.5 text-xs text-[var(--color-error)]">
              {result.error}
            </p>
          )}
        </div>
      </div>

      {/* Right: status + tx link */}
      <div className="flex items-center gap-2">
        {result.status === 'confirmed' && (
          <span className="text-sm text-[var(--color-success)]">
            {t('send.statusConfirmed')}
          </span>
        )}
        {result.status === 'failed' && (
          <span className="text-sm text-[var(--color-error)]">
            {t('send.statusFailed')}
          </span>
        )}
        {result.status === 'pending' && (
          <span className="text-sm text-[var(--color-text-muted)]">
            {t('send.statusPending')}
          </span>
        )}

        {result.txHash && (
          <a
            href={`${OPSCAN_BASE_URL}/tx/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent)]/10"
            title={result.txHash}
          >
            {result.txHash.slice(0, 8)}...{result.txHash.slice(-6)}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
