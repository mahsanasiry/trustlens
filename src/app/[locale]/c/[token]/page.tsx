import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PaginationNav } from '@/components/pagination-nav';
import { SearchResultCard } from '@/components/search/search-result-card';
import { parseCollectionPage } from '@/lib/data/collection-params';
import { getSharedCollection, listSharedCollectionItems } from '@/lib/data/collections';
import { isLocaleCode } from '@/lib/i18n/locales';

interface SharedCollectionPageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// A link that was shared on purpose should not be indexed or followed from
// search results, so the page stays out of them.
export async function generateMetadata({
  params,
}: SharedCollectionPageProps): Promise<Metadata> {
  const { locale, token } = await params;
  if (!isLocaleCode(locale)) return {};
  const collection = await getSharedCollection(token);
  return {
    title: collection?.title ?? undefined,
    robots: { index: false, follow: false },
  };
}

export default async function SharedCollectionPage({
  params,
  searchParams,
}: SharedCollectionPageProps) {
  const { locale, token } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const collection = await getSharedCollection(token);
  if (!collection) notFound();

  const page = parseCollectionPage(await searchParams);
  const [t, result] = await Promise.all([
    getTranslations('collections'),
    listSharedCollectionItems(token, page),
  ]);

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <h1 dir="auto">{collection.title}</h1>
            {collection.description ? (
              <p className="page__lead" dir="auto">
                {collection.description}
              </p>
            ) : null}
            <p className="page__note">
              {t('shared.by', { name: collection.owner_name })}
            </p>
          </header>
        </div>
      </section>

      <div className="container page__body">
        {result.items.length > 0 ? (
          <ul className="search-results">
            {result.items.map((item) => (
              <SearchResultCard key={`${item.kind}-${item.id}`} result={item} />
            ))}
          </ul>
        ) : null}
        <PaginationNav
          pathname={`/c/${token}`}
          page={page}
          pageCount={result.pageCount}
        />
      </div>
    </main>
  );
}
