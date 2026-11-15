import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { StatusBadge } from '@/components/claims/status-badge';
import { CheckLabel } from '@/components/sources/check-mark';
import { assessmentByCriterion } from '@/lib/data/assessments';
import { getSource } from '@/lib/data/sources';
import { assessmentCriteria } from '@/lib/domain/enums';
import { BookmarkButton } from '@/components/bookmarks/bookmark-button';
import { AddToCollection } from '@/components/collections/add-to-collection';
import { getSession } from '@/lib/auth/session';
import { isBookmarked } from '@/lib/data/bookmarks';
import { listCollectionChoices } from '@/lib/data/collections';
import { firstValue } from '@/lib/data/params';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link } from '@/lib/i18n/navigation';
import { safeHttpUrl } from '@/lib/safe-url';

interface SourcePageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: SourcePageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) return {};
  const source = await getSource(id);
  return source ? { title: source.title } : {};
}

export default async function SourcePage({ params, searchParams }: SourcePageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const [source, t, tEvidence, format] = await Promise.all([
    getSource(id),
    getTranslations('sources'),
    getTranslations('evidence'),
    getFormatter(),
  ]);
  if (!source) notFound();

  const session = await getSession();
  const choices = session ? await listCollectionChoices() : [];
  const added = firstValue((await searchParams).added) === '1';
  const saved = session ? await isBookmarked('source', source.id) : false;
  const href = safeHttpUrl(source.url);
  const byCriterion = assessmentByCriterion(source.source_assessments);
  const date = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container container--narrow">
          <Link href="/sources" className="back-link">
            {t('compare.back')}
          </Link>

          <header className="claim-head">
            <div className="claim-card__meta">
              <span className="claim-card__category">{t(`type.${source.type}`)}</span>
            </div>
            <h1 className="claim-head__title" lang={source.language} dir="auto">
              {source.title}
            </h1>
            <p className="page__note">{t('assessmentNote')}</p>

            <BookmarkButton
              kind="source"
              id={source.id}
              saved={saved}
              signedIn={session !== null}
              next={`/sources/${source.id}`}
            />

            {session ? (
              <AddToCollection
                kind="source"
                id={source.id}
                choices={choices}
                next={`/sources/${source.id}`}
                added={added}
              />
            ) : null}

            <dl className="facts">
              <div>
                <dt>{t('detail.publisher')}</dt>
                <dd lang={source.language} dir="auto">
                  {source.publisher}
                </dd>
              </div>
              {source.authors.length > 0 ? (
                <div>
                  <dt>{t('detail.authors')}</dt>
                  <dd lang={source.language} dir="auto">
                    {format.list(source.authors, { type: 'conjunction' })}
                  </dd>
                </div>
              ) : null}
              {source.published_on ? (
                <div>
                  <dt>{t('detail.publishedOn')}</dt>
                  <dd>{date(source.published_on)}</dd>
                </div>
              ) : null}
              {source.accessed_on ? (
                <div>
                  <dt>{t('detail.accessedOn')}</dt>
                  <dd>{date(source.accessed_on)}</dd>
                </div>
              ) : null}
            </dl>
            {href ? (
              <p className="claim-head__open">
                <a
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="btn btn--quiet"
                >
                  {t('detail.open')}
                </a>
              </p>
            ) : null}
          </header>
        </div>
      </section>

      <div className="container container--narrow page__body">
        <section aria-labelledby="checks-heading" className="detail-section">
          <h2 id="checks-heading">{t('detail.checks')}</h2>
          <ul className="check-list">
            {assessmentCriteria.map((criterion) => {
              const assessment = byCriterion.get(criterion);
              return (
                <li key={criterion}>
                  <h3>{t(`criteria.${criterion}`)}</h3>
                  {assessment ? (
                    <>
                      <p>
                        <CheckLabel status={assessment.status} />
                      </p>
                      {assessment.notes ? (
                        <p className="muted" lang={source.language} dir="auto">
                          {assessment.notes}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="muted">{t('compare.notAssessed')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="cited-heading" className="detail-section">
          <h2 id="cited-heading">{t('detail.citedBy')}</h2>
          {source.citedBy.length === 0 ? (
            <p className="muted">{t('detail.citedByNone')}</p>
          ) : (
            <ul className="related">
              {source.citedBy.map((citation) => (
                <li key={citation.evidenceId}>
                  <span className="related__claim">
                    <span className={`pos-${citation.position}`}>
                      <span
                        className={`marker marker--${citation.position}`}
                        aria-hidden="true"
                      />
                      <span className="visually-hidden">
                        {tEvidence(`positions.${citation.position}`)}:{' '}
                      </span>
                    </span>
                    <Link
                      href={`/claims/${citation.claim.id}`}
                      lang={citation.claim.language}
                      dir="auto"
                    >
                      {citation.claim.title}
                    </Link>
                  </span>
                  <StatusBadge status={citation.claim.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
