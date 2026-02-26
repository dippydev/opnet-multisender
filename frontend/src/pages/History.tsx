import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Trash2,
  List,
  BarChart3,
} from 'lucide-react';
import ScheduledSends from '../components/transaction/ScheduledSends';
import Dashboard from '../components/analytics/Dashboard';
import { useHistoryStore, type HistoryEntry } from '../store/historyStore';
import { useWallet } from '../hooks/useWallet';
import { OPSCAN_BASE_URL } from '../config/constants';
import { downloadHistoryReceipt } from '../lib/receipt';

const STATUS_CONFIG = {
  completed: {
    Icon: CheckCircle,
    color: 'text-[var(--color-success)]',
    border: 'border-[var(--color-success)]/30',
  },
  partial: {
    Icon: AlertTriangle,
    color: 'text-[var(--color-warning)]',
    border: 'border-[var(--color-warning)]/30',
  },
  failed: {
    Icon: XCircle,
    color: 'text-[var(--color-error)]',
    border: 'border-[var(--color-error)]/30',
  },
} as const;

type HistoryTab = 'history' | 'analytics';

export default function History() {
  const { t } = useTranslation();
  const { address } = useWallet();
  const { entries, loading, loadHistory, removeEntry } = useHistoryStore();
  const [activeTab, setActiveTab] = useState<HistoryTab>('history');

  useEffect(() => {
    if (address) {
      void loadHistory(address);
    }
  }, [address, loadHistory]);

  const tabs: Array<{ key: HistoryTab; labelKey: string; Icon: typeof List }> = [
    { key: 'history', labelKey: 'receipt.historyTitle', Icon: List },
    { key: 'analytics', labelKey: 'analytics.title', Icon: BarChart3 },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">
        {t('pages.history.title')}
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-8">
        {t('pages.history.description')}
      </p>

      <ScheduledSends />

      {/* Tab switcher */}
      <div className="mt-8 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]'
            }`}
          >
            <tab.Icon className="h-4 w-4" />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {loading && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t('receipt.loading')}
              </p>
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t('receipt.noHistory')}
              </p>
            </div>
          )}

          {!loading &&
            entries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                onExport={() => downloadHistoryReceipt(entry)}
                onRemove={() => removeEntry(entry.id)}
              />
            ))}
        </div>
      )}

      {activeTab === 'analytics' && <Dashboard entries={entries} />}
    </div>
  );
}

function HistoryRow({
  entry,
  onExport,
  onRemove,
}: {
  entry: HistoryEntry;
  onExport: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[entry.status];
  const { Icon } = config;

  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`group rounded-lg border ${config.border} bg-[var(--color-bg-card)] p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: status + details */}
        <div className="flex items-start gap-3 min-w-0">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.color}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-[var(--color-text-primary)]">
                {entry.tokenSymbol}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-border)] text-[var(--color-text-muted)]">
                {t(`receipt.status${entry.status.charAt(0).toUpperCase()}${entry.status.slice(1)}`)}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              {t('receipt.entryDetail', {
                count: entry.recipientCount,
                amount: entry.totalAmount,
                symbol: entry.tokenSymbol,
              })}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {dateStr} {timeStr}
            </p>
            {/* Tx hashes */}
            {entry.txHashes.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {entry.txHashes.map((hash) => (
                  <a
                    key={hash}
                    href={`${OPSCAN_BASE_URL}/tx/${hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 transition-colors"
                    title={hash}
                  >
                    {hash.slice(0, 8)}...{hash.slice(-6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onExport}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
            title={t('receipt.export')}
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-md p-1.5 text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
            title={t('receipt.remove')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
