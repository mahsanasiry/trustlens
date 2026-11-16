import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SourceForm } from '@/components/studio/source-form';
import { StudioFrame } from '@/components/studio/studio-frame';
import { getSession } from '@/lib/auth/session';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface NewSourcePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: NewSourcePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'studio' });
  return { title: t('new.source'), robots: { index: false } };
}

export default async function NewSourcePage({ params }: NewSourcePageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role === 'user') notFound();

  const t = await getTranslations('studio');

  return (
    <StudioFrame title={t('new.source')} lead={t('new.sourceLead')}>
      <SourceForm locale={locale} source={null} editable />
    </StudioFrame>
  );
}
