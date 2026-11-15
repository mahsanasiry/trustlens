import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SourceCard } from '@/components/sources/source-card';
import { SourceFilterBar } from '@/components/sources/source-filter-bar';
import { SourcePagination } from '@/components/sources/source-pagination';
import { parseSourceFilters } from '@/lib/data/source-params';
import { listSources } from '@/lib/data/sources';
import { isLocaleCode } from '@/lib/i18n/locales';
import { getPathname } from '@/lib/i18n/navigation';

interface SourcesPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: SourcesPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'sources' });
  return { title: t('title') };
}

export default async function SourcesPage({ params, searchParams }: SourcesPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const filters = parseSourceFilters(await searchParams);
  const [t, format, result] = await Promise.all([
    getTranslations('sources'),
    getFormatter(),
    listSources(filters),
  ]);

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <h1>{t('title')}</h1>
            <p className="page__lead">{t('lead')}</p>
            <p className="page__note">{t('assessmentNote')}</p>
          </header>
        </div>
      </section>

      <div className="container page__body">
        <SourceFilterBar
          action={getPathname({ href: '/sources', locale })}
          filters={filters}
        />

        <p className="result-count" role="status">
          {t('resultCount', { count: format.number(result.total) })}
        </p>

        {result.items.length > 0 ? (
          <form
            method="get"
            action={getPathname({ href: '/sources/compare', locale })}
            className="compare-form"
          >
            <div className="compare-bar">
              <p className="muted">{t('compare.hint')}</p>
              <button type="submit" className="btn btn--primary btn--small">
                {t('compare.action')}
              </button>
            </div>
            <div className="claim-grid">
              {result.items.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </form>
        ) : (
          <div className="empty">
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.body')}</p>
          </div>
        )}

        <SourcePagination filters={filters} pageCount={result.pageCount} />
      </div>
    </main>
  );
}
