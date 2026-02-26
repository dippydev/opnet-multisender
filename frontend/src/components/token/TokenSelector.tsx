import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Bitcoin, Coins, Search, X } from 'lucide-react';
import type { KnownToken } from '../../config/constants';
import { useToken, type TokenInfo } from '../../hooks/useToken';
import { useTokenBalances } from '../../hooks/useTokenBalances';
import { useGlobalTokens } from '../../hooks/useGlobalTokens';
import BalanceDisplay, { formatBalance } from './BalanceDisplay';

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

  const { tokens: globalTokens, registerToken } = useGlobalTokens();

  const { btcBalance, tokenBalances, loading: balancesLoading } =
    useTokenBalances(walletAddress, globalTokens);

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
    // Register with server so it appears globally for everyone
    void registerToken(addr);
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

  function getKnownTokenBalance(address: string): bigint | null {
    const entry = tokenBalances.find(
      (tb) => tb.address.toLowerCase() === address.toLowerCase(),
    );
    return entry ? entry.balance : null;
  }

  return (
    <div className="space-y-4">
      <label className="block text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)]">
        {t('token.label')}
      </label>

      {/* Dropdown trigger */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-left transition-colors hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none"
        >
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-4 w-4 animate-pulse bg-[var(--color-border)]" />
            ) : token?.isBTC ? (
              <Bitcoin className="h-4 w-4 text-[var(--color-accent)]" />
            ) : token ? (
              <Coins className="h-4 w-4 text-[var(--color-accent)]" />
            ) : (
              <Coins className="h-4 w-4 text-[var(--color-text-muted)]" />
            )}
            {loading ? (
              <div className="h-3 w-32 animate-pulse bg-[var(--color-border)]" />
            ) : (
              <span
                className={`text-[13px] ${
                  token
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {getSelectedLabel()}
              </span>
            )}
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 mt-px w-full border border-[var(--color-border)] bg-[var(--color-bg-card)]">
            {/* BTC option */}
            <button
              type="button"
              onClick={handleSelectBTC}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-card-hover)]"
            >
              <Bitcoin className="h-4 w-4 text-[var(--color-accent)]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                    BTC ({t('token.native')})
                  </span>
                  {walletAddress && (
                    <span className="ml-2 font-mono text-[11px] text-[var(--color-text-muted)]">
                      {balancesLoading ? (
                        <span className="inline-block h-3 w-16 animate-pulse bg-[var(--color-border)]" />
                      ) : (
                        `${formatBalance(btcBalance, 8)} tBTC`
                      )}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  {t('token.btcDescription')}
                </div>
              </div>
            </button>

            {/* Divider */}
            {globalTokens.length > 0 && (
              <div className="border-t border-[var(--color-border)]" />
            )}

            {/* Known tokens */}
            {globalTokens.map((kt) => {
              const bal = getKnownTokenBalance(kt.address);
              return (
                <button
                  key={kt.address}
                  type="button"
                  onClick={() => handleSelectKnown(kt)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-card-hover)]"
                >
                  <Coins className="h-4 w-4 text-[var(--color-text-secondary)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                        {kt.symbol}
                      </span>
                      {walletAddress && (
                        <span className="ml-2 font-mono text-[11px] text-[var(--color-text-muted)]">
                          {balancesLoading ? (
                            <span className="inline-block h-3 w-16 animate-pulse bg-[var(--color-border)]" />
                          ) : bal !== null ? (
                            `${formatBalance(bal, kt.decimals)} ${kt.symbol}`
                          ) : null}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                      {kt.name}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Divider */}
            <div className="border-t border-[var(--color-border)]" />

            {/* Custom token input toggle */}
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--color-bg-card-hover)]"
              >
                <Search className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--color-text-secondary)]">
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
                  className="flex-1 border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-[12px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customAddress.trim()}
                  className="bg-[var(--color-accent)] px-3 py-2 text-[11px] font-bold tracking-[0.15em] uppercase text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {t('token.go')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomAddress('');
                  }}
                  className="p-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-4 py-2 text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--color-error)]">
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
