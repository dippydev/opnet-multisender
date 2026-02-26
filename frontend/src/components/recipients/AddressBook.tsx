import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookUser,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  UserPlus,
} from 'lucide-react';
import {
  useRecipientStore,
  generateRecipientId,
} from '../../store/recipientStore';
import type { AddressBookEntry } from '../../store/recipientStore';
import { validateAddress } from '../../lib/validation';

interface AddressBookProps {
  onClose?: () => void;
}

export default function AddressBook({ onClose }: AddressBookProps) {
  const { t } = useTranslation();
  const {
    addressBook,
    addToAddressBook,
    updateAddressBookEntry,
    removeFromAddressBook,
    addRecipients,
  } = useRecipientStore();

  // Add new entry form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editLabel, setEditLabel] = useState('');

  // Multi-select for picker
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleAdd = useCallback(() => {
    const trimAddr = newAddress.trim();
    const trimLabel = newLabel.trim();
    if (!trimAddr || !trimLabel) return;
    addToAddressBook(trimAddr, trimLabel);
    setNewAddress('');
    setNewLabel('');
    setShowAddForm(false);
  }, [newAddress, newLabel, addToAddressBook]);

  const handleStartEdit = useCallback((entry: AddressBookEntry) => {
    setEditingId(entry.id);
    setEditAddress(entry.address);
    setEditLabel(entry.label);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const trimAddr = editAddress.trim();
    const trimLabel = editLabel.trim();
    if (!trimAddr || !trimLabel) return;
    updateAddressBookEntry(editingId, {
      address: trimAddr,
      label: trimLabel,
    });
    setEditingId(null);
  }, [editingId, editAddress, editLabel, updateAddressBookEntry]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === addressBook.length) {
        return new Set();
      }
      return new Set(addressBook.map((e) => e.id));
    });
  }, [addressBook]);

  const handleAddSelected = useCallback(() => {
    const entries = addressBook.filter((e) => selected.has(e.id));
    if (entries.length === 0) return;
    const recipients = entries.map((e) => ({
      id: generateRecipientId(),
      address: e.address,
      amount: '',
    }));
    addRecipients(recipients);
    setSelected(new Set());
    onClose?.();
  }, [addressBook, selected, addRecipients, onClose]);

  const addrValid = newAddress.trim()
    ? validateAddress(newAddress.trim()).valid
    : true;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookUser className="h-5 w-5 text-[var(--color-accent)]" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            {t('addressBook.title')}
          </h3>
          {addressBook.length > 0 && (
            <span className="rounded-full bg-[var(--color-accent)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
              {addressBook.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('addressBook.addEntry')}
        </button>
      </div>

      {/* Add new entry form */}
      {showAddForm && (
        <div className="rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-bg)] p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t('addressBook.labelPlaceholder')}
              autoFocus
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setShowAddForm(false);
              }}
            />
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder={t('addressBook.addressPlaceholder')}
              className={`flex-[2] rounded-lg border bg-[var(--color-bg-card)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)] ${
                !addrValid
                  ? 'border-[var(--color-error)]'
                  : 'border-[var(--color-border)]'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setShowAddForm(false);
              }}
            />
          </div>
          {!addrValid && (
            <p className="mb-2 text-xs text-[var(--color-error)]">
              {t('recipients.errors.invalidPrefix')}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewAddress('');
                setNewLabel('');
              }}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              {t('addressBook.cancel')}
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={
                !newAddress.trim() || !newLabel.trim() || !addrValid
              }
              className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('addressBook.save')}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {addressBook.length === 0 && !showAddForm && (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center">
          <BookUser className="mx-auto mb-2 h-8 w-8 text-[var(--color-text-muted)]" />
          <p className="text-sm text-[var(--color-text-muted)]">
            {t('addressBook.empty')}
          </p>
        </div>
      )}

      {/* Entry list with checkboxes */}
      {addressBook.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]">
          {/* Select all header */}
          <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-2">
            <input
              type="checkbox"
              checked={
                selected.size === addressBook.length && addressBook.length > 0
              }
              onChange={toggleSelectAll}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className="text-xs font-medium text-[var(--color-text-muted)]">
              {selected.size > 0
                ? t('addressBook.selectedCount', { count: selected.size })
                : t('addressBook.selectAll')}
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {addressBook.map((entry) => {
              const isEditing = editingId === entry.id;
              const isSelected = selected.has(entry.id);

              return (
                <div
                  key={entry.id}
                  className={`group flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 last:border-b-0 transition-colors ${
                    isSelected ? 'bg-[var(--color-accent)]/5' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(entry.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                  />

                  {isEditing ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-28 rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-2 py-1 text-xs font-mono text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="rounded p-1 text-[var(--color-success)] hover:bg-[var(--color-success)]/10"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {entry.label}
                        </span>
                        <span className="truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                          {entry.address}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(entry)}
                          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-primary)]"
                          title={t('addressBook.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromAddressBook(entry.id)}
                          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
                          title={t('addressBook.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add selected to recipients */}
      {selected.size > 0 && (
        <button
          type="button"
          onClick={handleAddSelected}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <UserPlus className="h-4 w-4" />
          {t('addressBook.addToRecipients', { count: selected.size })}
        </button>
      )}
    </div>
  );
}
