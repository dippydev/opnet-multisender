import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const THEME_KEY = 'multisender_theme';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* ignore */ }
  return 'dark';
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch { /* ignore quota errors */ }
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const label = theme === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark');

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] transition-colors"
      title={label}
      aria-label={label}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" />
      ) : (
        <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" />
      )}
    </button>
  );
}
