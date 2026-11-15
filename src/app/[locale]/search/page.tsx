import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { SearchForm } from '@/components/search/search-form';
import { SearchPagination } from '@/components/search/search-pagination';
import { SearchResultCard } from '@/components/search/search-result-card';
import { searchContent } from '@/lib/data/search';
import { isSearchable, parseSearchFilters } from '@/lib/data/search-params';
import { isLocaleCode } from '@/lib/i18n/locales';
import { getPathname } from '@/lib/i18n/navigation';

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'search' });
  return { title: t('title'), robots: { index: false } };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const filters = parseSearchFilters(await searchParams);
  const [t, format, result] = await Promise.all([
    getTranslations('search'),
    getFormatter(),
    searchContent(filters),
  ]);

  const hasQuery = filters.q !== '';
  const searchable = isSearchable(filters.q);

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <h1>{t('title')}</h1>
            <p className="page__lead">{t('lead')}</p>
          </header>
        </div>
      </section>

      <div className="container page__body">
        <SearchForm action={getPathname({ href: '/search', locale })} filters={filters} />

        {!hasQuery ? (
          <div className="empty">
            <h2>{t('start.title')}</h2>
            <p>{t('start.body')}</p>
          </div>
        ) : !searchable ? (
          <p className="result-count" role="status">
            {t('tooShort')}
          </p>
        ) : (
          <>
            <p className="result-count" role="status">
              {t('resultCount', { count: format.number(result.total) })}
            </p>

            {result.items.length > 0 ? (
              <ul className="search-results">
                {result.items.map((item) => (
                  <SearchResultCard key={`${item.kind}-${item.id}`} result={item} />
                ))}
              </ul>
            ) : (
              <div className="empty">
                <h2>{t('empty.title')}</h2>
                <p>{t('empty.body')}</p>
              </div>
            )}

            <SearchPagination filters={filters} pageCount={result.pageCount} />
          </>
        )}
      </div>
    </main>
  );
}
