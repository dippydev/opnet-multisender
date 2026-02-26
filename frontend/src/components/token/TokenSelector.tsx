import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Bitcoin, Coins, Search, X } from 'lucide-react';
import { KNOWN_TOKENS, type KnownToken } from '../../config/constants';
import { useToken, type TokenInfo } from '../../hooks/useToken';
import BalanceDisplay from './BalanceDisplay';

interface TokenSelectorProps {
  walletAddress: string | null;
  onTokenChange: (token: TokenInfo | null) => void;
}

export default function TokenSelector({
  walletAddress,
  onTokenChange,
}: TokenSelectorProps) {
  const { t } = useTranslation();
  const {
    token,
    loading,
    error,
    selectBTC,
    selectKnownToken,
    selectCustomToken,
  } = useToken(walletAddress);

  const [isOpen, setIsOpen] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notify parent when token changes
  useEffect(() => {
    onTokenChange(token);
  }, [token, onTokenChange]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelectBTC() {
    selectBTC();
    setIsOpen(false);
    setShowCustomInput(false);
    setCustomAddress('');
  }

  function handleSelectKnown(t: KnownToken) {
    selectKnownToken(t);
    setIsOpen(false);
    setShowCustomInput(false);
    setCustomAddress('');
  }

  function handleCustomSubmit() {
    const addr = customAddress.trim();
    if (!addr) return;
    selectCustomToken(addr);
    setIsOpen(false);
    setShowCustomInput(false);
  }

  function handleCustomKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  }

  function getSelectedLabel(): string {
    if (!token) return t('token.selectToken');
    if (token.isBTC) return `${token.symbol} (${t('token.native')})`;
    return `${token.symbol} — ${token.name}`;
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
        {t('token.label')}
      </label>

      {/* Dropdown trigger */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-left transition-colors hover:border-[var(--color-border-hover)] focus:border-[var(--color-accent)] focus:outline-none"
        >
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--color-border)]" />
            ) : token?.isBTC ? (
              <Bitcoin className="h-5 w-5 text-[var(--color-accent)]" />
            ) : token ? (
              <Coins className="h-5 w-5 text-[var(--color-accent)]" />
            ) : (
              <Coins className="h-5 w-5 text-[var(--color-text-muted)]" />
            )}
            {loading ? (
              <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-border)]" />
            ) : (
              <span
                className={
                  token
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)]'
                }
              >
                {getSelectedLabel()}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-lg">
            {/* BTC option */}
            <button
              type="button"
              onClick={handleSelectBTC}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-card-hover)]"
            >
              <Bitcoin className="h-5 w-5 text-[var(--color-accent)]" />
              <div>
                <div className="font-medium text-[var(--color-text-primary)]">
                  BTC ({t('token.native')})
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {t('token.btcDescription')}
                </div>
              </div>
            </button>

            {/* Divider */}
            {KNOWN_TOKENS.length > 0 && (
              <div className="border-t border-[var(--color-border)]" />
            )}

            {/* Known tokens */}
            {KNOWN_TOKENS.map((kt) => (
              <button
                key={kt.address}
                type="button"
                onClick={() => handleSelectKnown(kt)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-card-hover)]"
              >
                <Coins className="h-5 w-5 text-[var(--color-text-secondary)]" />
                <div>
                  <div className="font-medium text-[var(--color-text-primary)]">
                    {kt.symbol}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {kt.name}
                  </div>
                </div>
              </button>
            ))}

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Custom token input toggle */}
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-card-hover)]"
              >
                <Search className="h-5 w-5 text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-secondary)]">
                  {t('token.customAddress')}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-3">
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  onKeyDown={handleCustomKeyDown}
                  placeholder={t('token.pasteAddress')}
                  autoFocus
                  className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customAddress.trim()}
                  className="rounded bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                  {t('token.go')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomAddress('');
                  }}
                  className="rounded p-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-2 text-sm text-[var(--color-error)]">
          {t('token.invalidAddress')}
        </div>
      )}

      {/* Balance display */}
      {token && (
        <BalanceDisplay
          balance={token.balance}
          decimals={token.decimals}
          symbol={token.symbol}
          loading={loading}
        />
      )}
    </div>
  );
}
