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
    border: 'border-[var(--color-border)]',
    badge: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  },
  partial: {
    Icon: AlertTriangle,
    color: 'text-[var(--color-warning)]',
    border: 'border-[var(--color-border)]',
    badge: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  },
  failed: {
    Icon: XCircle,
    color: 'text-[var(--color-error)]',
    border: 'border-[var(--color-border)]',
    badge: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-24">
      <div className="mb-16">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.04em] uppercase text-[var(--color-text-primary)] mb-2">
          {t('pages.history.title')}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {t('pages.history.description')}
        </p>
      </div>

      <ScheduledSends />

      {/* Tab switcher — Swiss text-based */}
      <div className="mt-8 flex gap-6 border-b border-[var(--color-border)] pb-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <tab.Icon className="h-4 w-4" />
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'history' && (
        <div>
          {loading && (
            <div className="border border-[var(--color-border)] p-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t('receipt.loading')}
              </p>
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="border border-[var(--color-border)] p-8 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                {t('receipt.noHistory')}
              </p>
            </div>
          )}

          {/* Table layout for history */}
          {!loading && entries.length > 0 && (
            <div className="border border-[var(--color-border)] overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b border-[var(--color-border)]">
                  <tr className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-muted)]">
                    <th className="p-4 sm:p-6">Timestamp</th>
                    <th className="p-4 sm:p-6">Asset</th>
                    <th className="p-4 sm:p-6 text-right hidden sm:table-cell">Amount</th>
                    <th className="p-4 sm:p-6 text-right hidden sm:table-cell">Recipients</th>
                    <th className="p-4 sm:p-6 text-center">Status</th>
                    <th className="p-4 sm:p-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {entries.map((entry) => (
                    <HistoryRow
                      key={entry.id}
                      entry={entry}
                      onExport={() => downloadHistoryReceipt(entry)}
                      onRemove={() => removeEntry(entry.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
  const config = STATUS_CONFIG[entry.status];

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
    <tr className="text-sm group hover:bg-[var(--color-bg-card-hover)] transition-colors">
      <td className="p-4 sm:p-6 font-mono text-xs text-[var(--color-text-secondary)]">
        {dateStr} {timeStr}
      </td>
      <td className="p-4 sm:p-6">
        <div className="font-bold text-[var(--color-text-primary)]">{entry.tokenSymbol}</div>
        {entry.txHashes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {entry.txHashes.slice(0, 2).map((hash) => (
              <a
                key={hash}
                href={`${OPSCAN_BASE_URL}/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--color-accent)] hover:underline"
                title={hash}
              >
                {hash.slice(0, 8)}...
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        )}
      </td>
      <td className="p-4 sm:p-6 text-right font-mono hidden sm:table-cell">
        {entry.totalAmount}
      </td>
      <td className="p-4 sm:p-6 text-right font-mono hidden sm:table-cell">
        {String(entry.recipientCount).padStart(2, '0')}
      </td>
      <td className="p-4 sm:p-6 text-center">
        <span className={`text-[9px] font-black tracking-tight uppercase px-2 py-1 ${config.badge}`}>
          {entry.status}
        </span>
      </td>
      <td className="p-4 sm:p-6 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={onExport}
            className="p-1.5 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-all hover:text-[var(--color-error)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
