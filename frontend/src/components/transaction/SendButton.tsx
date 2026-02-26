import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Loader2, Send, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useMultiSender, type BatchResult } from '../../hooks/useMultiSender';
import { useBTCSend } from '../../hooks/useBTCSend';
import { useRecipientStore } from '../../store/recipientStore';

interface SendButtonProps {
  disabled?: boolean;
  onResults: (results: BatchResult[]) => void;
}

export default function SendButton({ disabled, onResults }: SendButtonProps) {
  const { t } = useTranslation();
  const { sendMode } = useRecipientStore();
  const isBTC = sendMode === 'btc';

  const {
    sending: op20Sending,
    batchResults: op20BatchResults,
    currentBatch: op20CurrentBatch,
    totalBatches: op20TotalBatches,
    sendOP20,
  } = useMultiSender();

  const {
    sending: btcSending,
    batchResults: btcBatchResults,
    currentBatch: btcCurrentBatch,
    totalBatches: btcTotalBatches,
    sendBTC,
  } = useBTCSend();

  const sending = isBTC ? btcSending : op20Sending;
  const batchResults = isBTC ? btcBatchResults : op20BatchResults;
  const currentBatch = isBTC ? btcCurrentBatch : op20CurrentBatch;
  const totalBatches = isBTC ? btcTotalBatches : op20TotalBatches;

  const handleSend = useCallback(async () => {
    try {
      const results = isBTC ? await sendBTC() : await sendOP20();
      // Show toast based on results
      const confirmed = results.filter((r) => r.status === 'confirmed').length;
      const failed = results.filter((r) => r.status === 'failed').length;
      if (confirmed === results.length) {
        toast.success(t('toast.sendSuccess'));
      } else if (failed === results.length) {
        toast.error(t('toast.sendAllFailed'));
      } else if (failed > 0) {
        toast.warning(t('toast.sendPartial', { confirmed, failed }));
      }
      onResults(results);
    } catch (err) {
      console.error('Send failed:', err);
      toast.error(t('toast.sendError', {
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [isBTC, sendBTC, sendOP20, onResults, t]);

  // Show batch progress during send
  if (sending && batchResults.length > 0) {
    return (
      <div className="space-y-4">
        {/* Progress header */}
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--color-accent)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isBTC
            ? t('send.btcProgress', {
                current: currentBatch + 1,
                total: totalBatches,
              })
            : t('send.batchProgress', {
                current: currentBatch + 1,
                total: totalBatches,
              })}
        </div>

        {/* Batch/recipient status list */}
        <div className="space-y-2">
          {batchResults.map((batch) => (
            <BatchStatusRow
              key={batch.batchIndex}
              batch={batch}
              isBTC={isBTC}
            />
          ))}
        </div>
      </div>
    );
  }

  // Send button
  return (
    <button
      type="button"
      onClick={() => void handleSend()}
      disabled={disabled || sending}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-6 py-4 text-lg font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_30px_rgba(247,147,26,0.3)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
    >
      <Send className="h-5 w-5" />
      {isBTC ? t('send.sendBTC') : t('send.sendNow')}
    </button>
  );
}

function BatchStatusRow({
  batch,
  isBTC,
}: {
  batch: BatchResult;
  isBTC?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        batch.status === 'confirmed'
          ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
          : batch.status === 'failed'
            ? 'border-[var(--color-error)]/30 bg-[var(--color-error)]/5'
            : batch.status === 'sending'
              ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5'
              : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
      }`}
    >
      <div className="flex items-center gap-3">
        {batch.status === 'pending' && (
          <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)]" />
        )}
        {batch.status === 'sending' && (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
        )}
        {batch.status === 'confirmed' && (
          <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
        )}
        {batch.status === 'failed' && (
          <XCircle className="h-4 w-4 text-[var(--color-error)]" />
        )}

        <span className="text-sm text-[var(--color-text-primary)]">
          {isBTC
            ? t('send.recipient', { index: batch.batchIndex + 1 })
            : t('send.batch', { index: batch.batchIndex + 1 })}
        </span>
        {!isBTC && (
          <span className="text-xs text-[var(--color-text-muted)]">
            ({t('send.recipientCount', { count: batch.recipientCount })})
          </span>
        )}
      </div>

      <div className="text-sm">
        {batch.status === 'pending' && (
          <span className="text-[var(--color-text-muted)]">
            {t('send.statusPending')}
          </span>
        )}
        {batch.status === 'sending' && (
          <span className="text-[var(--color-accent)]">
            {t('send.statusSending')}
          </span>
        )}
        {batch.status === 'confirmed' && (
          <span className="text-[var(--color-success)]">
            {t('send.statusConfirmed')}
          </span>
        )}
        {batch.status === 'failed' && (
          <span className="text-[var(--color-error)]" title={batch.error}>
            {t('send.statusFailed')}
          </span>
        )}
      </div>
    </div>
  );
}
