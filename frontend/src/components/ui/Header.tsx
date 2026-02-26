import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { WalletButton } from '../wallet/WalletButton';
import { NetworkBadge } from './NetworkBadge';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';
import { useIsOwner } from '../../hooks/useIsOwner';
import bitsendLogo from '../../assets/bitsendlogo.svg';

const baseNavItems = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/app', labelKey: 'nav.multisender' },
  { to: '/history', labelKey: 'nav.history' },
] as const;

const adminNavItem = { to: '/admin', labelKey: 'nav.admin' } as const;

export function Header() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { isOwner } = useIsOwner();

  const navItems = useMemo(
    () => (isOwner ? [...baseNavItems, adminNavItem] : [...baseNavItems]),
    [isOwner],
  );

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on click outside
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-12">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] sm:hidden"
              aria-label={t('nav.menu')}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <NavLink to="/" className="flex items-center">
              <img src={bitsendLogo} alt={t('app.title')} className="h-8" />
            </NavLink>
            <nav className="hidden sm:flex items-center gap-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `text-[11px] font-medium tracking-[0.15em] uppercase transition-colors ${
                      isActive
                        ? 'text-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NetworkBadge />
            <LanguageSelector />
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div
          ref={menuRef}
          className="border-t border-[var(--color-border)] bg-[var(--color-bg)] sm:hidden"
        >
          <nav className="mx-auto max-w-7xl px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block px-3 py-2.5 text-[11px] font-medium tracking-[0.15em] uppercase transition-colors ${
                    isActive
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`
                }
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
