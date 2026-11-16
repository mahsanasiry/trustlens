import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EvidenceForm } from '@/components/studio/evidence-form';
import { StudioFrame } from '@/components/studio/studio-frame';
import { getSession } from '@/lib/auth/session';
import { getClaimTitle, listPickableSources } from '@/lib/data/authoring';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface NewEvidencePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: NewEvidencePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'authoring' });
  return { title: t('evidence.newTitle'), robots: { index: false } };
}

export default async function NewEvidencePage({ params }: NewEvidencePageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role === 'user') notFound();

  const claimTitle = await getClaimTitle(id);
  if (!claimTitle) notFound();

  const [t, sources] = await Promise.all([
    getTranslations('authoring'),
    listPickableSources(),
  ]);

  return (
    <StudioFrame
      title={t('evidence.newTitle')}
      lead={t('evidence.forClaim', { title: claimTitle })}
      back={{ href: `/studio/claims/${id}`, label: t('evidence.back') }}
    >
      <p className="studio-section__lead">{t('evidence.newLead')}</p>
      <EvidenceForm
        locale={locale}
        claimId={id}
        evidence={null}
        sources={sources}
        editable
      />
    </StudioFrame>
  );
}
