import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { ScrollRegion } from '@/components/scroll-region';
import { CheckLabel } from '@/components/sources/check-mark';
import { compareMin, parseCompareIds } from '@/lib/data/source-params';
import { assessmentByCriterion } from '@/lib/data/assessments';
import { getSourcesForComparison } from '@/lib/data/sources';
import { assessmentCriteria } from '@/lib/domain/enums';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link } from '@/lib/i18n/navigation';

interface ComparePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: ComparePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'sources' });
  return { title: t('compare.title') };
}

export default async function ComparePage({ params, searchParams }: ComparePageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const selection = parseCompareIds((await searchParams).ids);
  const [t, format, sources] = await Promise.all([
    getTranslations('sources'),
    getFormatter(),
    getSourcesForComparison(selection.ids),
  ]);

  // Unpublished or unknown ids simply drop out, so count what actually loaded.
  const ready = sources.length >= compareMin;
  const lookups = sources.map((source) =>
    assessmentByCriterion(source.source_assessments),
  );

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <Link href="/sources" className="back-link">
            {t('compare.back')}
          </Link>
          <header className="page__header">
            <h1>{t('compare.title')}</h1>
            <p className="page__note">{t('assessmentNote')}</p>
            {selection.truncated ? <p className="muted">{t('compare.limited')}</p> : null}
          </header>
        </div>
      </section>

      <div className="container page__body">
        {ready ? (
          <ScrollRegion label={t('compare.title')}>
            <table className="compare-table">
              <thead>
                <tr>
                  <td />
                  {sources.map((source) => {
                    const rest = sources.filter((other) => other.id !== source.id);
                    return (
                      <th key={source.id} scope="col">
                        <Link
                          href={`/sources/${source.id}`}
                          lang={source.language}
                          dir="auto"
                          className="compare-table__title"
                        >
                          {source.title}
                        </Link>
                        <Link
                          href={{
                            pathname: '/sources/compare',
                            query: { ids: rest.map((other) => other.id) },
                          }}
                          className="compare-table__remove"
                        >
                          <span aria-hidden="true">×</span>
                          <span className="visually-hidden">
                            {t('compare.remove', { title: source.title })}
                          </span>
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{t('detail.publisher')}</th>
                  {sources.map((source) => (
                    <td key={source.id} lang={source.language} dir="auto">
                      {source.publisher}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{t('filters.type')}</th>
                  {sources.map((source) => (
                    <td key={source.id}>{t(`type.${source.type}`)}</td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">{t('detail.publishedOn')}</th>
                  {sources.map((source) => (
                    <td key={source.id}>
                      {source.published_on
                        ? format.dateTime(new Date(source.published_on), {
                            dateStyle: 'medium',
                            timeZone: 'UTC',
                          })
                        : '—'}
                    </td>
                  ))}
                </tr>
                {assessmentCriteria.map((criterion) => (
                  <tr key={criterion}>
                    <th scope="row">{t(`criteria.${criterion}`)}</th>
                    {sources.map((source, index) => {
                      const assessment = lookups[index]?.get(criterion);
                      return (
                        <td key={source.id}>
                          {assessment ? (
                            <>
                              <CheckLabel status={assessment.status} />
                              {assessment.notes ? (
                                <span
                                  className="compare-table__note"
                                  lang={source.language}
                                  dir="auto"
                                >
                                  {assessment.notes}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="muted">{t('compare.notAssessed')}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <div className="empty">
            <h2>{t('compare.tooFew')}</h2>
            <p>
              <Link href="/sources" className="btn btn--primary">
                {t('compare.back')}
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
