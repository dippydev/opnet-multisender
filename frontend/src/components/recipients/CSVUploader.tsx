import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Download, AlertCircle, Server } from 'lucide-react';
import { useRecipientStore, type Recipient } from '../../store/recipientStore';
import { generateRecipientId } from '../../store/recipientStore';
import { parseCSV, generateTemplateCSV, downloadFile, type ParseError } from '../../lib/csv';
import { API_BASE_URL } from '../../config/constants';

interface ServerParseResult {
  recipients: Array<{ address: string; amount: string }>;
  errors: ParseError[];
  totalValid: number;
  totalErrors: number;
}

async function validateOnServer(csvText: string): Promise<ServerParseResult | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/csv/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: csvText }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerParseResult;
  } catch {
    return null;
  }
}

export default function CSVUploader() {
  const { t } = useTranslation();
  const { addRecipients } = useRecipientStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [usedServer, setUsedServer] = useState(false);
  const [lastResult, setLastResult] = useState<{
    added: number;
    errors: ParseError[];
  } | null>(null);

  const processText = useCallback(
    async (text: string) => {
      setIsValidating(true);
      setUsedServer(false);

      // Try server-side validation first
      const serverResult = await validateOnServer(text);

      if (serverResult) {
        // Server validation succeeded — use server results
        setUsedServer(true);
        const recipients: Recipient[] = serverResult.recipients.map((r) => ({
          id: generateRecipientId(),
          address: r.address,
          amount: r.amount,
        }));
        if (recipients.length > 0) {
          addRecipients(recipients);
        }
        setLastResult({
          added: recipients.length,
          errors: serverResult.errors,
        });
      } else {
        // Server unavailable — fall back to client-side parsing
        const result = parseCSV(text);
        if (result.recipients.length > 0) {
          addRecipients(result.recipients);
        }
        setLastResult({
          added: result.recipients.length,
          errors: result.errors,
        });
      }

      setIsValidating(false);
    },
    [addRecipients],
  );

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          void processText(text);
        }
      };
      reader.readAsText(file);
    },
    [processText],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0]!;
        if (
          file.name.endsWith('.csv') ||
          file.name.endsWith('.txt') ||
          file.type === 'text/csv' ||
          file.type === 'text/plain'
        ) {
          readFile(file);
        }
      }
    },
    [readFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        readFile(files[0]!);
      }
      // Reset so the same file can be picked again
      e.target.value = '';
    },
    [readFile],
  );

  const handleDownloadTemplate = useCallback(() => {
    downloadFile(generateTemplateCSV(), 'multisender-template.csv', 'text/csv');
  }, []);

  const handlePickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">
          {t('csv.title')}
        </h3>
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
        >
          <Download className="h-3 w-3" />
          {t('csv.downloadTemplate')}
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handlePickFile}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-bg-card)] hover:border-[var(--color-accent)]/50'
        }`}
      >
        {isValidating ? (
          <>
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-[var(--color-accent)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('csv.validating')}
            </p>
          </>
        ) : (
          <>
            <Upload
              className={`mx-auto mb-3 h-8 w-8 ${
                isDragging
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {t('csv.dragDrop')}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {t('csv.fileTypes')}
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,text/csv,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />

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
            {usedServer && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-success)]">
                <Server className="h-3 w-3" />
                {t('csv.serverValidated')}
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
