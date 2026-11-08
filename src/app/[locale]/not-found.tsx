import { useTranslations } from 'next-intl';

export default function NotFoundPage() {
  const t = useTranslations('common');

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl leading-tight font-semibold text-ink">
        {t('notFoundTitle')}
      </h1>
      <p className="mt-4 text-lg text-ink-muted">{t('notFoundBody')}</p>
    </main>
  );
}
