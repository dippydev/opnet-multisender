import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, QrCode } from 'lucide-react';
import {
  useRecipientStore,
  generateRecipientId,
} from '../../store/recipientStore';
import { validateAddress, validateAmount } from '../../lib/validation';
import QRScanner from './QRScanner';

export default function ManualEntry() {
  const { t } = useTranslation();
  const { recipients, addRecipient, updateRecipient, removeRecipient } =
    useRecipientStore();

  const [showQRScanner, setShowQRScanner] = useState(false);

  // Track which fields have been blurred for validation display
  const [touched, setTouched] = useState<
    Record<string, { address?: boolean; amount?: boolean }>
  >({});

  const handleAddRow = useCallback(() => {
    addRecipient({
      id: generateRecipientId(),
      address: '',
      amount: '',
    });
  }, [addRecipient]);

  const handleAddressChange = useCallback(
    (id: string, address: string) => {
      updateRecipient(id, { address });
    },
    [updateRecipient],
  );

  const handleAmountChange = useCallback(
    (id: string, amount: string) => {
      updateRecipient(id, { amount });
    },
    [updateRecipient],
  );

  const handleBlur = useCallback(
    (id: string, field: 'address' | 'amount') => {
      setTouched((prev) => ({
        ...prev,
        [id]: { ...prev[id], [field]: true },
      }));
    },
    [],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeRecipient(id);
      setTouched((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [removeRecipient],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
          {t('recipients.manualEntry')}
        </h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {t('recipients.count', { count: recipients.length })}
        </span>
      </div>

      {recipients.length === 0 && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('recipients.noRecipients')}
          </p>
        </div>
      )}

      {/* Column headers when there are recipients */}
      {recipients.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="w-6 shrink-0" />
          <span className="flex-1 text-xs font-medium text-[var(--color-text-muted)]">
            {t('recipients.addressLabel')}
          </span>
          <span className="w-40 shrink-0 text-xs font-medium text-[var(--color-text-muted)]">
            {t('recipients.amountLabel')}
          </span>
          <span className="w-8 shrink-0" />
        </div>
      )}

      {recipients.map((recipient, index) => {
        const addrTouched = touched[recipient.id]?.address ?? false;
        const amtTouched = touched[recipient.id]?.amount ?? false;
        const addressResult = addrTouched
          ? validateAddress(recipient.address)
          : { valid: true };
        const amountResult = amtTouched
          ? validateAmount(recipient.amount)
          : { valid: true };

        return (
          <div key={recipient.id} className="flex items-start gap-2">
            <span className="mt-3 w-6 shrink-0 text-center text-xs text-[var(--color-text-muted)]">
              {index + 1}
            </span>

            <div className="flex flex-1 flex-col gap-1">
              <input
                type="text"
                value={recipient.address}
                onChange={(e) =>
                  handleAddressChange(recipient.id, e.target.value)
                }
                onBlur={() => handleBlur(recipient.id, 'address')}
                placeholder={t('recipients.addressPlaceholder')}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent)] ${
                  !addressResult.valid
                    ? 'border-[var(--color-error)]'
                    : 'border-[var(--color-border)]'
                }`}
              />
              {!addressResult.valid && addressResult.error && (
                <p className="text-xs text-[var(--color-error)]">
                  {t(addressResult.error)}
                </p>
              )}
            </div>

            <div className="flex w-40 shrink-0 flex-col gap-1">
              <input
                type="text"
                value={recipient.amount}
                onChange={(e) =>
                  handleAmountChange(recipient.id, e.target.value)
                }
                onBlur={() => handleBlur(recipient.id, 'amount')}
                placeholder={t('recipients.amountPlaceholder')}
                className={`w-full rounded-lg border bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent)] ${
                  !amountResult.valid
                    ? 'border-[var(--color-error)]'
                    : 'border-[var(--color-border)]'
                }`}
              />
              {!amountResult.valid && amountResult.error && (
                <p className="text-xs text-[var(--color-error)]">
                  {t(amountResult.error)}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleRemove(recipient.id)}
              className="mt-2 shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
              title={t('recipients.removeRow')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      })}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAddRow}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus className="h-4 w-4" />
          {t('recipients.addRow')}
        </button>
        <button
          type="button"
          onClick={() => setShowQRScanner(true)}
          className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          title={t('qr.scanButton')}
        >
          <QrCode className="h-4 w-4" />
          <span className="hidden sm:inline">{t('qr.scanButton')}</span>
        </button>
      </div>

      {showQRScanner && (
        <QRScanner onClose={() => setShowQRScanner(false)} />
      )}
    </div>
  );
}
