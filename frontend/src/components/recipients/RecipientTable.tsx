import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlertTriangle, GitMerge, X, Users, Split, Percent } from 'lucide-react';
import { useRecipientStore } from '../../store/recipientStore';
import { validateAddress, validateAmount } from '../../lib/validation';
import AddressDisplay from '../ui/AddressDisplay';
import { formatBalance } from '../token/BalanceDisplay';

export default function RecipientTable() {
  const { t } = useTranslation();
  const {
    recipients,
    updateRecipient,
    removeRecipient,
    clearRecipients,
    selectedToken,
    distributionMode,
    setDistributionMode,
    airdropTotalAmount,
    setAirdropTotalAmount,
    recalculateAirdropAmounts,
    percentageTotalAmount,
    setPercentageTotalAmount,
    updateRecipientPercentage,
    recalculatePercentageAmounts,
  } = useRecipientStore();

  const isAirdrop = distributionMode === 'airdrop';
  const isPercentage = distributionMode === 'percentage';
  const isAutoAmount = isAirdrop || isPercentage;

  // Recalculate amounts when total or recipient count changes in airdrop mode
  useEffect(() => {
    if (isAirdrop && recipients.length > 0) {
      recalculateAirdropAmounts();
    }
  }, [isAirdrop, airdropTotalAmount, recipients.length, recalculateAirdropAmounts]);

  // Recalculate amounts when total or percentages change in percentage mode
  useEffect(() => {
    if (isPercentage && recipients.length > 0) {
      recalculatePercentageAmounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPercentage, percentageTotalAmount, recipients.length, recalculatePercentageAmounts,
    // Also recalculate when any percentage value changes
    ...recipients.map((r) => r.percentage),
  ]);

  // Percentage sum validation
  const percentageSum = useMemo(() => {
    if (!isPercentage) return 0;
    let sum = 0;
    for (const r of recipients) {
      const pct = Number(r.percentage);
      if (!isNaN(pct) && pct > 0) {
        sum += pct;
      }
    }
    // Round to avoid floating point artifacts like 99.99999999999999
    return Math.round(sum * 1e10) / 1e10;
  }, [isPercentage, recipients]);

  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: 'address' | 'amount';
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Detect duplicates: map address → array of recipient IDs
  const duplicateMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const r of recipients) {
      const addr = r.address.trim().toLowerCase();
      if (!addr) continue;
      const existing = map.get(addr);
      if (existing) {
        existing.push(r.id);
      } else {
        map.set(addr, [r.id]);
      }
    }
    // Only keep entries with > 1 occurrence
    const dupes = new Map<string, string[]>();
    for (const [addr, ids] of map) {
      if (ids.length > 1) {
        dupes.set(addr, ids);
      }
    }
    return dupes;
  }, [recipients]);

  // Set of recipient IDs that are duplicates
  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const idList of duplicateMap.values()) {
      for (const id of idList) {
        ids.add(id);
      }
    }
    return ids;
  }, [duplicateMap]);

  // Total amount sum
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

  // User balance as a formatted number
  const userBalance = useMemo(() => {
    if (!selectedToken) return null;
    return Number(
      formatBalance(selectedToken.balance, selectedToken.decimals),
    );
  }, [selectedToken]);

  const insufficientBalance =
    userBalance !== null && totalAmount > userBalance;

  // Merge duplicate addresses: sum their amounts, keep first entry
  const handleMergeDuplicates = useCallback(() => {
    const mergeMap = new Map<
      string,
      { keepId: string; totalAmount: number }
    >();
    const toRemove: string[] = [];

    for (const r of recipients) {
      const addr = r.address.trim().toLowerCase();
      if (!addr) continue;
      const existing = mergeMap.get(addr);
      const amt = Number(r.amount) || 0;
      if (existing) {
        existing.totalAmount += amt;
        toRemove.push(r.id);
      } else {
        mergeMap.set(addr, { keepId: r.id, totalAmount: amt });
      }
    }

    // Update kept entries with merged amounts
    for (const { keepId, totalAmount: mergedAmt } of mergeMap.values()) {
      updateRecipient(keepId, { amount: String(mergedAmt) });
    }
    // Remove duplicate entries
    for (const id of toRemove) {
      removeRecipient(id);
    }
  }, [recipients, updateRecipient, removeRecipient]);

  // Inline edit handlers
  const startEdit = useCallback(
    (id: string, field: 'address' | 'amount', currentValue: string) => {
      setEditingCell({ id, field });
      setEditValue(currentValue);
    },
    [],
  );

  const commitEdit = useCallback(() => {
    if (editingCell) {
      updateRecipient(editingCell.id, { [editingCell.field]: editValue });
      setEditingCell(null);
      setEditValue('');
    }
  }, [editingCell, editValue, updateRecipient]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  if (recipients.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header with count and clear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">
            {t('table.recipients')}
          </h3>
          <span className="rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
            {recipients.length}
          </span>
        </div>
        <button
          type="button"
          onClick={clearRecipients}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-error)] transition-colors hover:bg-[var(--color-error)]/10"
        >
          <X className="h-3 w-3" />
          {t('table.clearAll')}
        </button>
      </div>

      {/* Distribution mode toggle */}
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
          <button
            type="button"
            onClick={() => setDistributionMode('custom')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              distributionMode === 'custom'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-accent)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Split className="h-4 w-4" />
            <span className="hidden sm:inline">{t('airdrop.customAmounts')}</span>
            <span className="sm:hidden">{t('airdrop.customAmountsShort')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDistributionMode('airdrop')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isAirdrop
                ? 'bg-[var(--color-bg-card)] text-[var(--color-accent)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('airdrop.equalSplit')}</span>
            <span className="sm:hidden">{t('airdrop.equalSplitShort')}</span>
          </button>
          <button
            type="button"
            onClick={() => setDistributionMode('percentage')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isPercentage
                ? 'bg-[var(--color-bg-card)] text-[var(--color-accent)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <Percent className="h-4 w-4" />
            <span className="hidden sm:inline">{t('percentage.title')}</span>
            <span className="sm:hidden">{t('percentage.titleShort')}</span>
          </button>
        </div>

        {/* Airdrop total input */}
        {isAirdrop && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
              {t('airdrop.totalAmount')}:
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={airdropTotalAmount}
              onChange={(e) => setAirdropTotalAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
            />
            {selectedToken && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {selectedToken.symbol}
              </span>
            )}
          </div>
        )}

        {/* Per-recipient amount display */}
        {isAirdrop && recipients.length > 0 && Number(airdropTotalAmount) > 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {t('airdrop.perRecipient', {
              amount: (Number(airdropTotalAmount) / recipients.length)
                .toFixed(18)
                .replace(/\.?0+$/, ''),
              count: recipients.length,
            })}
            {selectedToken ? ` ${selectedToken.symbol}` : ''}
          </p>
        )}

        {/* Percentage total input */}
        {isPercentage && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
              {t('percentage.totalAmount')}:
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={percentageTotalAmount}
              onChange={(e) => setPercentageTotalAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
            />
            {selectedToken && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {selectedToken.symbol}
              </span>
            )}
          </div>
        )}

        {/* Percentage sum validation */}
        {isPercentage && recipients.length > 0 && (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${
              percentageSum === 100
                ? 'text-[var(--color-success)]'
                : 'text-[var(--color-warning)]'
            }`}>
              {t('percentage.sumLabel')}: {percentageSum}%
            </span>
            {percentageSum !== 100 && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-warning)]">
                <AlertTriangle className="h-3 w-3" />
                {t('percentage.sumWarning')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Duplicate warning */}
      {duplicateMap.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
            <span className="text-sm text-[var(--color-warning)]">
              {t('table.duplicatesFound', { count: duplicateMap.size })}
            </span>
          </div>
          <button
            type="button"
            onClick={handleMergeDuplicates}
            className="flex items-center gap-1 rounded-md bg-[var(--color-warning)]/20 px-3 py-1.5 text-xs font-medium text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning)]/30"
          >
            <GitMerge className="h-3 w-3" />
            {t('table.mergeDuplicates')}
          </button>
        </div>
      )}

      {/* Desktop table (hidden on mobile) */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                {t('recipients.addressLabel')}
              </th>
              {isPercentage && (
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                  %
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                {t('recipients.amountLabel')}
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                {t('table.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((r, index) => {
              const addrValid = validateAddress(r.address);
              const amtValid = validateAmount(r.amount);
              const isDuplicate = duplicateIds.has(r.id);
              const isEditingAddress =
                editingCell?.id === r.id && editingCell.field === 'address';
              const isEditingAmount =
                editingCell?.id === r.id && editingCell.field === 'amount';

              return (
                <tr
                  key={r.id}
                  className={`border-b border-[var(--color-border)] last:border-b-0 ${
                    !addrValid.valid || !amtValid.valid
                      ? 'bg-[var(--color-error)]/5'
                      : isDuplicate
                        ? 'bg-[var(--color-warning)]/5'
                        : ''
                  }`}
                >
                  {/* Row number */}
                  <td className="px-4 py-3 text-[var(--color-text-muted)]">
                    {index + 1}
                  </td>

                  {/* Address */}
                  <td className="px-4 py-3">
                    {isEditingAddress ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        className="w-full rounded border border-[var(--color-accent)] bg-[var(--color-bg)] px-2 py-1 font-mono text-sm text-[var(--color-text-primary)] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(r.id, 'address', r.address)}
                        className={`text-left ${
                          !addrValid.valid
                            ? 'text-[var(--color-error)]'
                            : isDuplicate
                              ? 'text-[var(--color-warning)]'
                              : ''
                        }`}
                        title={
                          !addrValid.valid
                            ? t(addrValid.error ?? '')
                            : isDuplicate
                              ? t('table.duplicate')
                              : t('table.clickToEdit')
                        }
                      >
                        <AddressDisplay address={r.address} maxLength={20} />
                      </button>
                    )}
                  </td>

                  {/* Percentage input (percentage mode only) */}
                  {isPercentage && (
                    <td className="px-4 py-3 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={r.percentage ?? ''}
                        onChange={(e) =>
                          updateRecipientPercentage(r.id, e.target.value)
                        }
                        placeholder="0"
                        className="w-20 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-right font-mono text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                      />
                    </td>
                  )}

                  {/* Amount */}
                  <td className="px-4 py-3 text-right">
                    {isAutoAmount ? (
                      <span
                        className={`font-mono ${
                          !amtValid.valid
                            ? 'text-[var(--color-error)]'
                            : 'text-[var(--color-text-muted)]'
                        }`}
                        title={isAirdrop ? t('airdrop.autoCalculated') : t('percentage.autoCalculated')}
                      >
                        {r.amount || '—'}
                      </span>
                    ) : isEditingAmount ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        className="w-28 rounded border border-[var(--color-accent)] bg-[var(--color-bg)] px-2 py-1 text-right font-mono text-sm text-[var(--color-text-primary)] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(r.id, 'amount', r.amount)}
                        className={`font-mono ${
                          !amtValid.valid
                            ? 'text-[var(--color-error)]'
                            : 'text-[var(--color-text-primary)]'
                        }`}
                        title={
                          !amtValid.valid
                            ? t(amtValid.error ?? '')
                            : t('table.clickToEdit')
                        }
                      >
                        {r.amount || '—'}
                      </button>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeRecipient(r.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
                      title={t('recipients.removeRow')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list (visible only on mobile) */}
      <div className="space-y-3 sm:hidden">
        {recipients.map((r, index) => {
          const addrValid = validateAddress(r.address);
          const amtValid = validateAmount(r.amount);
          const isDuplicate = duplicateIds.has(r.id);
          const isEditingAddress =
            editingCell?.id === r.id && editingCell.field === 'address';
          const isEditingAmount =
            editingCell?.id === r.id && editingCell.field === 'amount';

          return (
            <div
              key={r.id}
              className={`rounded-lg border p-3 ${
                !addrValid.valid || !amtValid.valid
                  ? 'border-[var(--color-error)]/30 bg-[var(--color-error)]/5'
                  : isDuplicate
                    ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-card)]'
              }`}
            >
              {/* Card header: index + delete */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--color-text-muted)]">
                  #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRecipient(r.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
                  title={t('recipients.removeRow')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Address */}
              <div className="mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  {t('recipients.addressLabel')}
                </span>
                {isEditingAddress ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                    className="mt-0.5 w-full rounded border border-[var(--color-accent)] bg-[var(--color-bg)] px-2 py-1 font-mono text-sm text-[var(--color-text-primary)] outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(r.id, 'address', r.address)}
                    className={`mt-0.5 block w-full text-left ${
                      !addrValid.valid
                        ? 'text-[var(--color-error)]'
                        : isDuplicate
                          ? 'text-[var(--color-warning)]'
                          : ''
                    }`}
                  >
                    <AddressDisplay address={r.address} maxLength={16} />
                  </button>
                )}
              </div>

              {/* Percentage (if percentage mode) + Amount */}
              <div className={`flex gap-3 ${isPercentage ? 'items-end' : ''}`}>
                {isPercentage && (
                  <div className="flex-1">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">%</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.percentage ?? ''}
                      onChange={(e) =>
                        updateRecipientPercentage(r.id, e.target.value)
                      }
                      placeholder="0"
                      className="mt-0.5 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 font-mono text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                    {t('recipients.amountLabel')}
                  </span>
                  {isAutoAmount ? (
                    <p className={`mt-0.5 font-mono text-sm ${
                      !amtValid.valid
                        ? 'text-[var(--color-error)]'
                        : 'text-[var(--color-text-muted)]'
                    }`}>
                      {r.amount || '—'}
                    </p>
                  ) : isEditingAmount ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      className="mt-0.5 w-full rounded border border-[var(--color-accent)] bg-[var(--color-bg)] px-2 py-1 font-mono text-sm text-[var(--color-text-primary)] outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(r.id, 'amount', r.amount)}
                      className={`mt-0.5 block font-mono text-sm ${
                        !amtValid.valid
                          ? 'text-[var(--color-error)]'
                          : 'text-[var(--color-text-primary)]'
                      }`}
                    >
                      {r.amount || '—'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Total to send */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {t('table.totalToSend')}:
            </span>
            <span className="font-mono text-sm font-semibold text-[var(--color-text-primary)]">
              {totalAmount.toLocaleString(undefined, {
                maximumFractionDigits: 18,
              })}
            </span>
            {selectedToken && (
              <span className="text-sm text-[var(--color-text-muted)]">
                {selectedToken.symbol}
              </span>
            )}
          </div>

          {/* User balance */}
          {selectedToken && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {t('table.yourBalance')}:
              </span>
              <span
                className={`font-mono text-sm font-semibold ${
                  insufficientBalance
                    ? 'text-[var(--color-error)]'
                    : 'text-[var(--color-text-primary)]'
                }`}
              >
                {formatBalance(
                  selectedToken.balance,
                  selectedToken.decimals,
                )}
              </span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {selectedToken.symbol}
              </span>
            </div>
          )}
        </div>

        {/* Insufficient balance warning */}
        {insufficientBalance && (
          <div className="mt-3 flex items-center gap-2 text-sm text-[var(--color-error)]">
            <AlertTriangle className="h-4 w-4" />
            {t('table.insufficientBalance')}
          </div>
        )}
      </div>
    </div>
  );
}
