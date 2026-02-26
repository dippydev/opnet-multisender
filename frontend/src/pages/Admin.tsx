import { useTranslation } from 'react-i18next';

export default function Admin() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">
        {t('pages.admin.title')}
      </h1>
      <p className="text-[var(--color-text-secondary)]">
        {t('pages.admin.description')}
      </p>
    </div>
  );
}
