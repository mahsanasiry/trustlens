import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { ClaimCard } from '@/components/claims/claim-card';
import { FilterBar } from '@/components/claims/filter-bar';
import { Pagination } from '@/components/claims/pagination';
import { parseClaimFilters } from '@/lib/data/claim-params';
import { listClaims } from '@/lib/data/claims';
import { isLocaleCode } from '@/lib/i18n/locales';
import { getPathname } from '@/lib/i18n/navigation';

interface ClaimsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: ClaimsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'claims' });
  return { title: t('title') };
}

export default async function ClaimsPage({ params, searchParams }: ClaimsPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const filters = parseClaimFilters(await searchParams);
  const [t, format, result] = await Promise.all([
    getTranslations('claims'),
    getFormatter(),
    listClaims(filters),
  ]);

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <h1>{t('title')}</h1>
            <p className="page__lead">{t('lead')}</p>
            <p className="page__note">{t('statusNote')}</p>
          </header>
        </div>
      </section>

      <div className="container page__body">
        <FilterBar action={getPathname({ href: '/claims', locale })} filters={filters} />

        <p className="result-count" role="status">
          {t('resultCount', { count: format.number(result.total) })}
        </p>

        {result.items.length > 0 ? (
          <div className="claim-grid">
            {result.items.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.body')}</p>
          </div>
        )}

        <Pagination filters={filters} pageCount={result.pageCount} />
      </div>
    </main>
  );
}
