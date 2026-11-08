import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocaleCode } from '@/lib/i18n/locales';
import { notFound } from 'next/navigation';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('home');

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-4xl leading-tight font-semibold text-ink">
        {t('title')}
      </h1>
      <p className="mt-4 text-lg text-ink-muted">{t('lead')}</p>
    </main>
  );
}
