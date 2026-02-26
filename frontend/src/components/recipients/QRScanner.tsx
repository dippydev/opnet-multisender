import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, AlertTriangle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  useRecipientStore,
  generateRecipientId,
} from '../../store/recipientStore';

interface QRScannerProps {
  onClose: () => void;
}

export default function QRScanner({ onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const { addRecipient } = useRecipientStore();
  const [error, setError] = useState<string | null>(null);
  const [scannedAddress, setScannedAddress] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      // Extract address from QR — could be a raw address or a bitcoin: URI
      let address = decodedText.trim();

      // Handle bitcoin: URI scheme
      if (address.toLowerCase().startsWith('bitcoin:')) {
        address = address.slice(8);
        // Remove any query params (?amount=X&label=Y)
        const qIdx = address.indexOf('?');
        if (qIdx !== -1) {
          address = address.slice(0, qIdx);
        }
      }

      setScannedAddress(address);

      // Add as recipient with empty amount
      addRecipient({
        id: generateRecipientId(),
        address,
        amount: '',
      });

      // Stop scanning after successful read
      void stopScanner();
    },
    [addRecipient, stopScanner],
  );

  useEffect(() => {
    const startScanner = async () => {
      if (!containerRef.current) return;

      const scannerId = 'qr-scanner-region';

      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          handleScanSuccess,
          // Ignore scan failures (these fire continuously while scanning)
          () => {},
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);

        if (
          message.includes('Permission') ||
          message.includes('NotAllowedError')
        ) {
          setError(t('qr.permissionDenied'));
        } else if (
          message.includes('NotFoundError') ||
          message.includes('no camera')
        ) {
          setError(t('qr.noCamera'));
        } else {
          setError(t('qr.startError'));
        }
      }
    };

    void startScanner();

    return () => {
      void stopScanner();
    };
  }, [handleScanSuccess, stopScanner, t]);

  const handleClose = useCallback(() => {
    void stopScanner().then(() => onClose());
  }, [stopScanner, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative mx-4 w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[var(--color-accent)]" />
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t('qr.title')}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner area */}
        {!error && !scannedAddress && (
          <>
            <p className="mb-3 text-sm text-[var(--color-text-muted)]">
              {t('qr.instruction')}
            </p>
            <div
              ref={containerRef}
              className="overflow-hidden rounded-lg"
            >
              <div id="qr-scanner-region" />
            </div>
          </>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertTriangle className="h-10 w-10 text-[var(--color-warning)]" />
            <p className="text-center text-sm text-[var(--color-text-secondary)]">
              {error}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)]"
            >
              {t('qr.close')}
            </button>
          </div>
        )}

        {/* Success state */}
        {scannedAddress && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success)]/10">
              <Camera className="h-6 w-6 text-[var(--color-success)]" />
            </div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {t('qr.scanned')}
            </p>
            <p className="max-w-full break-all rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
              {scannedAddress}
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
              {t('qr.done')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
