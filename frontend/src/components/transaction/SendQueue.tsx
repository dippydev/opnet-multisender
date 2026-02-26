import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  X,
} from 'lucide-react';
import { useRecipientStore } from '../../store/recipientStore';
import type { QueueEntry } from '../../store/recipientStore';

export default function SendQueue() {
  const { t } = useTranslation();
  const { sendQueue, removeFromQueue, clearQueue } = useRecipientStore();

  if (sendQueue.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
          <Layers className="h-4 w-4 text-[var(--color-accent)]" />
          {t('queue.title')}
          <span className="rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs text-[var(--color-accent)]">
            {sendQueue.length}
          </span>
        </h3>
        <button
          type="button"
          onClick={clearQueue}
          className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)]"
        >
          {t('queue.clearAll')}
        </button>
      </div>

      <div className="space-y-2">
        {sendQueue.map((entry) => (
          <QueueEntryRow
            key={entry.id}
            entry={entry}
            onRemove={() => removeFromQueue(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  completed: {
    icon: CheckCircle,
    color: 'var(--color-success)',
    labelKey: 'queue.statusCompleted',
  },
  partial: {
    icon: AlertTriangle,
    color: 'var(--color-warning)',
    labelKey: 'queue.statusPartial',
  },
  failed: {
    icon: XCircle,
    color: 'var(--color-error)',
    labelKey: 'queue.statusFailed',
  },
} as const;

function QueueEntryRow({
  entry,
  onRemove,
}: {
  entry: QueueEntry;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[entry.status];
  const StatusIcon = config.icon;

  return (
    <div className="group flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
      <div className="flex items-center gap-3">
        <StatusIcon
          className="h-4 w-4 shrink-0"
          style={{ color: config.color }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {entry.tokenSymbol}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {entry.sendMode === 'btc'
                ? t('queue.modeBTC')
                : t('queue.modeOP20')}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {t('queue.entryDetail', {
              count: entry.recipientCount,
              amount: entry.totalAmount,
              symbol: entry.tokenSymbol,
            })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color: config.color }}>
          {t(config.labelKey)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 opacity-0 transition-opacity hover:bg-[var(--color-bg-card)] group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]" />
        </button>
      </div>
    </div>
  );
}
