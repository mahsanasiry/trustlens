import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SourceForm } from '@/components/studio/source-form';
import { ChecksSection } from '@/components/studio/checks-section';
import { ItemNotes } from '@/components/studio/item-notes';
import { StateTag } from '@/components/studio/state-tag';
import { StudioFrame } from '@/components/studio/studio-frame';
import { SubmitForReview } from '@/components/studio/submit-for-review';
import { getSession } from '@/lib/auth/session';
import { listOwnAssessments } from '@/lib/data/authoring';
import { getLatestDecision, getOwnSource } from '@/lib/data/studio';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface EditSourcePageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: EditSourcePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'studio' });
  return { title: t('sections.sources'), robots: { index: false } };
}

export default async function EditSourcePage({ params }: EditSourcePageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role === 'user') notFound();

  const source = await getOwnSource(id, session.actor.id);
  if (!source) notFound();

  const checks = await listOwnAssessments(source.id, session.actor.id);
  const decision =
    source.state === 'changes_requested' || source.state === 'rejected'
      ? await getLatestDecision('source', source.id)
      : null;
  const editable = source.state === 'draft' || source.state === 'changes_requested';

  return (
    <StudioFrame title={source.title} badge={<StateTag state={source.state} />}>
      <ItemNotes kind="source" id={source.id} state={source.state} decision={decision} />
      <SourceForm
        locale={locale}
        source={source}
        editable={editable}
        proposal={source.state === 'published'}
      />
      {editable ? <SubmitForReview locale={locale} kind="source" id={source.id} /> : null}
      <ChecksSection sourceId={source.id} checks={checks} />
    </StudioFrame>
  );
}
