import { validateAddress, validateAmount } from './validation';
import type { Recipient } from '../store/recipientStore';
import { generateRecipientId } from '../store/recipientStore';

export interface ParseError {
  line: number;
  raw: string;
  error: string; // i18n key
}

export interface ParseResult {
  recipients: Recipient[];
  errors: ParseError[];
}

/**
 * Parse CSV/text content into recipients.
 * Each line: address,amount (comma, tab, or space separated)
 * Skips empty lines and lines starting with # (comments).
 */
export function parseCSV(text: string): ParseResult {
  const recipients: Recipient[] = [];
  const errors: ParseError[] = [];

  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.trim();

    // Skip empty lines and comments
    if (raw.length === 0 || raw.startsWith('#')) {
      continue;
    }

    // Try splitting by comma, tab, or multiple spaces
    let parts: string[];
    if (raw.includes(',')) {
      parts = raw.split(',').map((p) => p.trim());
    } else if (raw.includes('\t')) {
      parts = raw.split('\t').map((p) => p.trim());
    } else {
      // Split by whitespace
      parts = raw.split(/\s+/);
    }

    if (parts.length < 2) {
      errors.push({
        line: i + 1,
        raw,
        error: 'csv.errors.missingFields',
      });
      continue;
    }

    const address = parts[0]!;
    const amount = parts[1]!;

    // Validate address
    const addrResult = validateAddress(address);
    if (!addrResult.valid) {
      errors.push({
        line: i + 1,
        raw,
        error: addrResult.error ?? 'csv.errors.invalidLine',
      });
      continue;
    }

    // Validate amount
    const amtResult = validateAmount(amount);
    if (!amtResult.valid) {
      errors.push({
        line: i + 1,
        raw,
        error: amtResult.error ?? 'csv.errors.invalidLine',
      });
      continue;
    }

    recipients.push({
      id: generateRecipientId(),
      address,
      amount,
    });
  }

  return { recipients, errors };
}

/**
 * Generate a template CSV string for download.
 */
export function generateTemplateCSV(): string {
  return [
    '# OPNet MultiSender CSV Template',
    '# Format: address,amount',
    '# Lines starting with # are ignored',
    'opt1pexampleaddress1qpzry9x8gf2tvdw0s3jn54khce6mua7lxyz,100',
    'opt1pexampleaddress2qpzry9x8gf2tvdw0s3jn54khce6mua7lxyz,200',
  ].join('\n');
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
