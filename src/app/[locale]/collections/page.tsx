import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CollectionCard } from '@/components/collections/collection-card';
import { CollectionFields } from '@/components/collections/collection-fields';
import { PaginationNav } from '@/components/pagination-nav';
import { getSession } from '@/lib/auth/session';
import { parseCollectionPage } from '@/lib/data/collection-params';
import { listMyCollections } from '@/lib/data/collections';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';
import { createCollection } from './actions';

interface CollectionsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: CollectionsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'collections' });
  return { title: t('title'), robots: { index: false } };
}

export default async function CollectionsPage({
  params,
  searchParams,
}: CollectionsPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });

  const page = parseCollectionPage(await searchParams);
  const [t, result] = await Promise.all([
    getTranslations('collections'),
    listMyCollections(page),
  ]);

  // Deleting the last collection on a page leaves that page empty.
  if (page > 1 && result.items.length === 0) {
    return redirect({ href: '/collections', locale });
  }

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
        <section className="card collection-create" aria-labelledby="create-heading">
          <h2 id="create-heading">{t('create.title')}</h2>
          <form action={createCollection} className="collection-form">
            <input type="hidden" name="locale" value={locale} />
            <CollectionFields idPrefix="create" />
            <button type="submit" className="btn btn--primary">
              {t('create.submit')}
            </button>
          </form>
        </section>

        {result.items.length > 0 ? (
          <ul className="collection-grid">
            {result.items.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </ul>
        ) : (
          <div className="empty">
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.body')}</p>
          </div>
        )}

        <PaginationNav pathname="/collections" page={page} pageCount={result.pageCount} />
      </div>
    </main>
  );
}
