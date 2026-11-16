import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { DecisionPanel, type Holder } from '@/components/review/decision-panel';
import { SubjectView } from '@/components/review/subject-view';
import { getSession } from '@/lib/auth/session';
import { getReviewItem } from '@/lib/data/review';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link, redirect } from '@/lib/i18n/navigation';

interface ReviewItemPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: ReviewItemPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'review' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ReviewItemPage({ params }: ReviewItemPageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  if (session.actor.role !== 'admin') notFound();

  const detail = await getReviewItem(id);
  if (!detail) notFound();

  const [t, tDecisions, tStudio, format] = await Promise.all([
    getTranslations('review'),
    getTranslations('review.decisions'),
    getTranslations('studio'),
    getFormatter(),
  ]);

  const me = session.actor.id;
  const holder: Holder =
    detail.claimedBy === null ? 'nobody' : detail.claimedBy === me ? 'you' : 'someone';
  const unknown = t('unknown');
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });

  const summary = detail.decision ? (
    <div className="review-decision">
      <p className="review-decision__line">
        {t('decided', {
          decision: tDecisions(detail.decision.decision),
          name: detail.decision.reviewerName ?? unknown,
          date: date(detail.decision.decidedAt),
        })}
      </p>
      {detail.decision.reason ? (
        <blockquote className="review-note">
          <p className="review-note__label">{tStudio('reviewerNote')}</p>
          <p dir="auto">{detail.decision.reason}</p>
        </blockquote>
      ) : null}
    </div>
  ) : null;

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <p className="studio-back">
              <Link href="/review" className="studio-back__link">
                {t('back')}
              </Link>
            </p>
            <h1 dir="auto">{detail.title ?? t(`types.${detail.targetType}`)}</h1>
            <p>
              <span className="state-tag">{t(`types.${detail.targetType}`)}</span>
            </p>
            <p className="page__lead">
              {t('by', { name: detail.submitterName ?? unknown })}
              {' · '}
              {date(detail.submittedAt)}
            </p>
          </header>
        </div>
      </section>

      <div className="container page__body">
        <div className="studio-stack">
          <section className="card review-subject">
            <SubjectView detail={detail} />
          </section>

          <DecisionPanel
            locale={locale}
            itemId={detail.id}
            targetType={detail.targetType}
            decided={detail.decidedAt !== null}
            holder={holder}
            holderName={detail.claimedByName}
            ownSubmission={detail.submittedBy === me}
            summary={summary}
          />
        </div>
      </div>
    </main>
  );
}
