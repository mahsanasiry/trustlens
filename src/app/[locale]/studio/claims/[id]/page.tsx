import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClaimForm } from '@/components/studio/claim-form';
import { EvidenceSection } from '@/components/studio/evidence-section';
import { ItemNotes } from '@/components/studio/item-notes';
import { StateTag } from '@/components/studio/state-tag';
import { StudioFrame } from '@/components/studio/studio-frame';
import { SubmitForReview } from '@/components/studio/submit-for-review';
import { getSession } from '@/lib/auth/session';
import { listClaimEvidence } from '@/lib/data/authoring';
import { getLatestDecision, getOwnClaim } from '@/lib/data/studio';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface EditClaimPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: EditClaimPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'studio' });
  return { title: t('sections.claims'), robots: { index: false } };
}

export default async function EditClaimPage({ params }: EditClaimPageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role === 'user') notFound();

  const claim = await getOwnClaim(id, session.actor.id);
  if (!claim) notFound();

  const evidence = await listClaimEvidence(claim.id, session.actor.id);
  const decision =
    claim.state === 'changes_requested' || claim.state === 'rejected'
      ? await getLatestDecision('claim', claim.id)
      : null;
  const editable = claim.state === 'draft' || claim.state === 'changes_requested';

  return (
    <StudioFrame title={claim.title} badge={<StateTag state={claim.state} />}>
      <ItemNotes kind="claim" id={claim.id} state={claim.state} decision={decision} />
      <ClaimForm
        locale={locale}
        claim={claim}
        editable={editable}
        proposal={claim.state === 'published'}
      />
      {editable ? <SubmitForReview locale={locale} kind="claim" id={claim.id} /> : null}
      <EvidenceSection claimId={claim.id} items={evidence} />
    </StudioFrame>
  );
}
