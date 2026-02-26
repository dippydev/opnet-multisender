import { downloadFile } from './csv';
import type { BatchResult } from '../hooks/useMultiSender';
import type { HistoryEntry } from '../store/historyStore';
import type { Recipient } from '../store/recipientStore';

/**
 * Generate a CSV receipt from the current send results + recipients.
 * Columns: Recipient Address, Amount, Token, Tx Hash, Status, Date
 */
export function generateReceiptFromResults(
  results: BatchResult[],
  recipients: Recipient[],
  tokenSymbol: string,
  isBTC: boolean,
  batchSize: number,
): string {
  const header = 'Recipient Address,Amount,Token,Tx Hash,Status,Date';
  const date = new Date().toISOString();
  const rows: string[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i]!;
    // Determine which batch this recipient belongs to
    const batchIndex = isBTC ? i : Math.floor(i / batchSize);
    const result = results[batchIndex];
    const txHash = result?.txHash ?? '';
    const status = result?.status ?? 'pending';

    rows.push(
      [
        escapeCSV(recipient.address),
        escapeCSV(recipient.amount),
        escapeCSV(tokenSymbol),
        escapeCSV(txHash),
        escapeCSV(status),
        escapeCSV(date),
      ].join(','),
    );
  }

  return [header, ...rows].join('\n');
}

/**
 * Generate a CSV receipt from a history entry.
 * Since we don't have per-recipient detail in history, each tx hash gets a row.
 */
export function generateReceiptFromHistory(entry: HistoryEntry): string {
  const header = 'Token,Total Amount,Recipients,Tx Hash,Status,Date';
  const rows: string[] = [];

  if (entry.txHashes.length > 0) {
    for (const txHash of entry.txHashes) {
      rows.push(
        [
          escapeCSV(entry.tokenSymbol),
          escapeCSV(entry.totalAmount),
          String(entry.recipientCount),
          escapeCSV(txHash),
          escapeCSV(entry.status),
          escapeCSV(entry.createdAt),
        ].join(','),
      );
    }
  } else {
    rows.push(
      [
        escapeCSV(entry.tokenSymbol),
        escapeCSV(entry.totalAmount),
        String(entry.recipientCount),
        '',
        escapeCSV(entry.status),
        escapeCSV(entry.createdAt),
      ].join(','),
    );
  }

  return [header, ...rows].join('\n');
}

/**
 * Download a receipt CSV for the current send.
 */
export function downloadReceipt(
  results: BatchResult[],
  recipients: Recipient[],
  tokenSymbol: string,
  isBTC: boolean,
  batchSize: number,
): void {
  const csv = generateReceiptFromResults(
    results,
    recipients,
    tokenSymbol,
    isBTC,
    batchSize,
  );
  const timestamp = new Date().toISOString().slice(0, 10);
  downloadFile(csv, `multisend-receipt-${timestamp}.csv`, 'text/csv');
}

/**
 * Download a receipt CSV for a history entry.
 */
export function downloadHistoryReceipt(entry: HistoryEntry): void {
  const csv = generateReceiptFromHistory(entry);
  const timestamp = entry.createdAt.slice(0, 10);
  downloadFile(
    csv,
    `multisend-receipt-${entry.tokenSymbol}-${timestamp}.csv`,
    'text/csv',
  );
}

/** Escape a CSV field value (wrap in quotes if contains comma/quote/newline). */
function escapeCSV(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
