import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EvidenceForm } from '@/components/studio/evidence-form';
import { ItemNotes } from '@/components/studio/item-notes';
import { StateTag } from '@/components/studio/state-tag';
import { StudioFrame } from '@/components/studio/studio-frame';
import { SubmitForReview } from '@/components/studio/submit-for-review';
import { getSession } from '@/lib/auth/session';
import { getClaimTitle, getOwnEvidence, listPickableSources } from '@/lib/data/authoring';
import { getLatestDecision } from '@/lib/data/studio';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface EditEvidencePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: EditEvidencePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'authoring' });
  return { title: t('evidence.section'), robots: { index: false } };
}

export default async function EditEvidencePage({ params }: EditEvidencePageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role === 'user') notFound();

  const evidence = await getOwnEvidence(id, session.actor.id);
  if (!evidence) notFound();

  const editable = evidence.state === 'draft' || evidence.state === 'changes_requested';
  const [t, claimTitle, sources, decision] = await Promise.all([
    getTranslations('authoring'),
    getClaimTitle(evidence.claim_id),
    listPickableSources(),
    evidence.state === 'changes_requested' || evidence.state === 'rejected'
      ? getLatestDecision('evidence', evidence.id)
      : null,
  ]);

  return (
    <StudioFrame
      title={evidence.title}
      lead={claimTitle ? t('evidence.forClaim', { title: claimTitle }) : undefined}
      badge={<StateTag state={evidence.state} />}
      back={{ href: `/studio/claims/${evidence.claim_id}`, label: t('evidence.back') }}
    >
      <ItemNotes
        kind="evidence"
        id={evidence.id}
        state={evidence.state}
        decision={decision}
      />
      <EvidenceForm
        locale={locale}
        claimId={evidence.claim_id}
        evidence={evidence}
        sources={sources}
        editable={editable}
      />
      {editable ? (
        <SubmitForReview locale={locale} kind="evidence" id={evidence.id} />
      ) : null}
    </StudioFrame>
  );
}
