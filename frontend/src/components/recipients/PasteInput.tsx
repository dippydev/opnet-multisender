import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardPaste, AlertCircle, FileText } from 'lucide-react';
import { useRecipientStore } from '../../store/recipientStore';
import { parseCSV, type ParseError } from '../../lib/csv';

export default function PasteInput() {
  const { t } = useTranslation();
  const { addRecipients } = useRecipientStore();
  const [text, setText] = useState('');
  const [lastResult, setLastResult] = useState<{
    added: number;
    errors: ParseError[];
  } | null>(null);

  const handleParse = useCallback(() => {
    if (!text.trim()) return;

    const result = parseCSV(text);
    if (result.recipients.length > 0) {
      addRecipients(result.recipients);
    }
    setLastResult({
      added: result.recipients.length,
      errors: result.errors,
    });
    // Clear textarea on successful parse
    if (result.recipients.length > 0 && result.errors.length === 0) {
      setText('');
    }
  }, [text, addRecipients]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
        {t('csv.pasteTitle')}
      </h3>

      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLastResult(null);
          }}
          placeholder={t('csv.pastePlaceholder')}
          rows={5}
          className="w-full resize-y rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 font-mono text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none transition-colors focus:border-[var(--color-accent)]"
        />
      </div>

      <button
        type="button"
        onClick={handleParse}
        disabled={!text.trim()}
        className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ClipboardPaste className="h-4 w-4" />
        {t('csv.parseButton')}
      </button>

      {/* Result feedback */}
      {lastResult && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className="text-sm text-[var(--color-text-primary)]">
              {t('csv.added', { count: lastResult.added })}
            </span>
            {lastResult.errors.length > 0 && (
              <span className="text-sm text-[var(--color-error)]">
                {t('csv.errorCount', { count: lastResult.errors.length })}
              </span>
            )}
          </div>

          {lastResult.errors.length > 0 && (
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
              {lastResult.errors.map((err) => (
                <div
                  key={`${err.line}-${err.raw}`}
                  className="flex items-start gap-1.5 text-xs"
                >
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-error)]" />
                  <span className="text-[var(--color-error)]">
                    {t('csv.lineError', { line: err.line })}
                  </span>
                  <span className="truncate text-[var(--color-text-muted)]">
                    {err.raw}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
