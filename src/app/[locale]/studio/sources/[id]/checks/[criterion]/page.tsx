import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AssessmentForm } from '@/components/studio/assessment-form';
import { ItemNotes } from '@/components/studio/item-notes';
import { StateTag } from '@/components/studio/state-tag';
import { StudioFrame } from '@/components/studio/studio-frame';
import { SubmitForReview } from '@/components/studio/submit-for-review';
import { getSession } from '@/lib/auth/session';
import { getOwnAssessment } from '@/lib/data/authoring';
import { isCriterion } from '@/lib/data/authoring-params';
import { getLatestDecision, getOwnSource } from '@/lib/data/studio';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface CheckPageProps {
  params: Promise<{ locale: string; id: string; criterion: string }>;
}

export async function generateMetadata({ params }: CheckPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'authoring' });
  return { title: t('checks.section'), robots: { index: false } };
}

export default async function CheckPage({ params }: CheckPageProps) {
  const { locale, id, criterion } = await params;
  if (!isLocaleCode(locale) || !isCriterion(criterion)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role === 'user') notFound();

  const source = await getOwnSource(id, session.actor.id);
  if (!source) notFound();

  const check = await getOwnAssessment(source.id, criterion, session.actor.id);
  const editable =
    !check || check.state === 'draft' || check.state === 'changes_requested';
  const [t, tCriteria, decision] = await Promise.all([
    getTranslations('authoring'),
    getTranslations('sources.criteria'),
    check && (check.state === 'changes_requested' || check.state === 'rejected')
      ? getLatestDecision('assessment', check.id)
      : null,
  ]);

  return (
    <StudioFrame
      title={t('checks.title', { criterion: tCriteria(criterion) })}
      lead={source.title}
      badge={check ? <StateTag state={check.state} /> : undefined}
      back={{ href: `/studio/sources/${source.id}`, label: t('checks.back') }}
    >
      {check ? (
        <ItemNotes
          kind="assessment"
          id={check.id}
          state={check.state}
          decision={decision}
        />
      ) : null}
      <AssessmentForm
        locale={locale}
        sourceId={source.id}
        criterion={criterion}
        assessment={check}
        editable={editable}
        proposal={check?.state === 'published'}
      />
      {check && editable ? (
        <SubmitForReview locale={locale} kind="assessment" id={check.id} />
      ) : null}
    </StudioFrame>
  );
}
