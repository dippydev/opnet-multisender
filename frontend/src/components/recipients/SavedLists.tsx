import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, FolderOpen, Trash2, X, ChevronDown } from 'lucide-react';
import { useRecipientStore } from '../../store/recipientStore';

export default function SavedLists() {
  const { t } = useTranslation();
  const { recipients, savedLists, saveList, loadList, deleteList } =
    useRecipientStore();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadDropdown, setShowLoadDropdown] = useState(false);
  const [listName, setListName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const trimmed = listName.trim();
    if (!trimmed || recipients.length === 0) return;
    saveList(trimmed);
    setListName('');
    setShowSaveModal(false);
  }, [listName, recipients.length, saveList]);

  const handleLoad = useCallback(
    (id: string) => {
      loadList(id);
      setShowLoadDropdown(false);
    },
    [loadList],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      deleteList(id);
    },
    [deleteList],
  );

  return (
    <div className="flex items-center gap-2">
      {/* Save List button */}
      <button
        type="button"
        onClick={() => setShowSaveModal(true)}
        disabled={recipients.length === 0}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text-secondary)]"
      >
        <Save className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t('savedLists.save')}</span>
      </button>

      {/* Load List button + dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowLoadDropdown((p) => !p)}
          disabled={savedLists.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--color-border)] disabled:hover:text-[var(--color-text-secondary)]"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('savedLists.load')}</span>
          {savedLists.length > 0 && (
            <span className="rounded-full bg-[var(--color-accent)]/20 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
              {savedLists.length}
            </span>
          )}
          <ChevronDown className="h-3 w-3" />
        </button>

        {/* Dropdown */}
        {showLoadDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowLoadDropdown(false)}
            />
            <div className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
              <div className="max-h-60 overflow-y-auto p-1">
                {savedLists.map((list) => (
                  <div
                    key={list.id}
                    className="group flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-[var(--color-bg)]"
                  >
                    <button
                      type="button"
                      onClick={() => handleLoad(list.id)}
                      className="flex min-w-0 flex-1 flex-col text-left"
                    >
                      <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {list.name}
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {t('savedLists.recipientCount', {
                          count: list.recipients.length,
                        })}{' '}
                        &middot;{' '}
                        {new Date(list.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, list.id)}
                      className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
                      title={t('savedLists.delete')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save modal overlay */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t('savedLists.saveTitle')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSaveModal(false);
                  setListName('');
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg)] hover:text-[var(--color-text-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
              {t('savedLists.saveDescription', {
                count: recipients.length,
              })}
            </p>

            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') {
                  setShowSaveModal(false);
                  setListName('');
                }
              }}
              placeholder={t('savedLists.namePlaceholder')}
              autoFocus
              className="mb-4 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-accent)] placeholder:text-[var(--color-text-muted)]"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSaveModal(false);
                  setListName('');
                }}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]"
              >
                {t('savedLists.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!listName.trim()}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('savedLists.saveButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
