import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Plus,
  Check,
  Trash2,
  X,
} from 'lucide-react';
import {
  useScheduledStore,
  type ScheduledSend,
} from '../../store/scheduledStore';

export default function ScheduledSends() {
  const { t } = useTranslation();
  const { scheduledSends, addScheduled, markDone, removeScheduled } =
    useScheduledStore();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
          <CalendarClock className="h-4 w-4 text-[var(--color-accent)]" />
          {t('scheduled.title')}
          {scheduledSends.length > 0 && (
            <span className="rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs text-[var(--color-accent)]">
              {scheduledSends.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
        >
          {showForm ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {showForm ? t('scheduled.cancel') : t('scheduled.create')}
        </button>
      </div>

      {showForm && (
        <ScheduledForm
          onAdd={(send) => {
            addScheduled(send);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {scheduledSends.length === 0 && !showForm && (
        <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">
          {t('scheduled.empty')}
        </p>
      )}

      {scheduledSends.length > 0 && (
        <div className="space-y-2">
          {scheduledSends.map((send) => (
            <ScheduledRow
              key={send.id}
              send={send}
              onMarkDone={() => markDone(send.id)}
              onDelete={() => removeScheduled(send.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduledForm({
  onAdd,
  onCancel,
}: {
  onAdd: (send: Omit<ScheduledSend, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [recipientCount, setRecipientCount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [note, setNote] = useState('');

  const canSave =
    tokenSymbol.trim() !== '' &&
    recipientCount.trim() !== '' &&
    Number(recipientCount) > 0 &&
    totalAmount.trim() !== '' &&
    Number(totalAmount) > 0 &&
    scheduledDate !== '';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onAdd({
      tokenSymbol: tokenSymbol.trim(),
      recipientCount: Number(recipientCount),
      totalAmount: totalAmount.trim(),
      scheduledDate,
      note: note.trim() || undefined,
      done: false,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className="mb-3 space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
            {t('scheduled.tokenLabel')}
          </label>
          <input
            type="text"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
            placeholder={t('scheduled.tokenPlaceholder')}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
            {t('scheduled.dateLabel')}
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
            {t('scheduled.recipientCountLabel')}
          </label>
          <input
            type="number"
            value={recipientCount}
            onChange={(e) => setRecipientCount(e.target.value)}
            placeholder="0"
            min="1"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
            {t('scheduled.totalAmountLabel')}
          </label>
          <input
            type="number"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="any"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">
          {t('scheduled.noteLabel')}
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('scheduled.notePlaceholder')}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          {t('scheduled.cancel')}
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-md bg-[var(--color-accent)] px-4 py-1.5 text-xs font-medium text-white transition-opacity disabled:opacity-40"
        >
          {t('scheduled.save')}
        </button>
      </div>
    </form>
  );
}

function ScheduledRow({
  send,
  onMarkDone,
  onDelete,
}: {
  send: ScheduledSend;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  const isOverdue =
    !send.done && new Date(send.scheduledDate) < new Date(new Date().toISOString().split('T')[0]!);

  return (
    <div
      className={`group flex items-center justify-between rounded-md border px-3 py-2 ${
        send.done
          ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/5'
          : isOverdue
            ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-bg)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMarkDone}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            send.done
              ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
              : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
          }`}
        >
          {send.done && <Check className="h-3 w-3" />}
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                send.done
                  ? 'text-[var(--color-text-muted)] line-through'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {send.tokenSymbol}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              {t('scheduled.detail', {
                count: send.recipientCount,
                amount: send.totalAmount,
                symbol: send.tokenSymbol,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs ${
                isOverdue
                  ? 'font-medium text-[var(--color-warning)]'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {isOverdue ? t('scheduled.overdue') : ''}{' '}
              {new Date(send.scheduledDate).toLocaleDateString()}
            </span>
            {send.note && (
              <span className="text-xs text-[var(--color-text-muted)] italic">
                {send.note}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1 opacity-0 transition-opacity hover:bg-[var(--color-bg-card)] group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-error)]" />
      </button>
    </div>
  );
}
