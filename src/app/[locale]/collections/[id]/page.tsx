import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CollectionFields } from '@/components/collections/collection-fields';
import { CopyLinkField } from '@/components/collections/copy-link-field';
import { PaginationNav } from '@/components/pagination-nav';
import { SearchResultCard } from '@/components/search/search-result-card';
import { getSession } from '@/lib/auth/session';
import {
  collectionItemsPageSize,
  editableVisibilities,
  parseCollectionPage,
} from '@/lib/data/collection-params';
import { getOwnedCollection, listCollectionItems } from '@/lib/data/collections';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link, redirect } from '@/lib/i18n/navigation';
import { siteUrl } from '@/lib/site';
import { UndoNotice } from '@/components/undo-notice';
import { parseRemoved } from '@/lib/data/undo-params';
import {
  addToCollection,
  changeCollectionItem,
  deleteCollection,
  updateCollection,
} from '../actions';

interface CollectionPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'collections' });
  return { title: t('title'), robots: { index: false } };
}

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });

  const collection = await getOwnedCollection(id, session.actor.id);
  if (!collection) notFound();

  const query = await searchParams;
  const page = parseCollectionPage(query);
  const removed = parseRemoved(query);
  const [t, result] = await Promise.all([
    getTranslations('collections'),
    listCollectionItems(collection.id, page),
  ]);

  // Removing the last item on a page leaves that page empty.
  if (page > 1 && result.items.length === 0) {
    return redirect({ href: `/collections/${collection.id}`, locale });
  }

  const offset = (page - 1) * collectionItemsPageSize;
  const visibility = editableVisibilities.find(
    (value) => value === collection.visibility,
  );
  const shareUrl = new URL(`/${locale}/c/${collection.share_token}`, siteUrl).toString();

  return (
    <main id="main" className="page">
      {removed ? (
        <UndoNotice
          message={t('itemRemoved')}
          action={addToCollection}
          fields={{
            collection_id: collection.id,
            kind: removed.kind,
            id: removed.id,
            next: `/collections/${collection.id}`,
          }}
        />
      ) : null}
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <Link href="/collections" className="back-link">
              {t('back')}
            </Link>
            <h1 dir="auto">{collection.title}</h1>
            {collection.description ? (
              <p className="page__lead" dir="auto">
                {collection.description}
              </p>
            ) : null}
          </header>
        </div>
      </section>

      <div className="container page__body">
        <section aria-labelledby="items-heading">
          <h2 id="items-heading">{t('items.title')}</h2>
          {result.items.length > 0 ? (
            <ul className="search-results">
              {result.items.map((item, index) => {
                const position = offset + index;
                return (
                  <SearchResultCard
                    key={`${item.kind}-${item.id}`}
                    result={item}
                    action={
                      <form action={changeCollectionItem} className="item-actions">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="collection_id" value={collection.id} />
                        <input
                          type="hidden"
                          name="item_id"
                          value={result.itemIds[index]}
                        />
                        <input type="hidden" name="page" value={page} />
                        <button
                          type="submit"
                          name="intent"
                          value="up"
                          className="btn btn--quiet btn--small"
                          disabled={position === 0}
                        >
                          {t('items.moveUp')}
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value="down"
                          className="btn btn--quiet btn--small"
                          disabled={position === result.total - 1}
                        >
                          {t('items.moveDown')}
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value="remove"
                          className="btn btn--quiet btn--small"
                        >
                          {t('items.remove')}
                        </button>
                      </form>
                    }
                  />
                );
              })}
            </ul>
          ) : (
            <div className="empty">
              <p>{t('items.empty')}</p>
            </div>
          )}
          <PaginationNav
            pathname={`/collections/${collection.id}`}
            page={page}
            pageCount={result.pageCount}
          />
        </section>

        <section className="card" aria-labelledby="share-heading">
          <h2 id="share-heading">{t('share.title')}</h2>
          {collection.visibility === 'private' ? (
            <p>{t('share.private')}</p>
          ) : (
            <CopyLinkField
              id="share-link"
              label={t('share.label')}
              hint={t('share.hint')}
              value={shareUrl}
              copyLabel={t('share.copy')}
              copiedLabel={t('share.copied')}
            />
          )}
        </section>

        <section className="card" aria-labelledby="details-heading">
          <h2 id="details-heading">{t('edit.title')}</h2>
          <form action={updateCollection} className="collection-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={collection.id} />
            <CollectionFields
              idPrefix="edit"
              defaults={{
                title: collection.title,
                description: collection.description,
                visibility: visibility ?? 'private',
              }}
            />
            <button type="submit" className="btn btn--primary">
              {t('edit.save')}
            </button>
          </form>
        </section>

        <section className="card danger-zone" aria-labelledby="delete-heading">
          <h2 id="delete-heading">{t('delete.title')}</h2>
          <p>{t('delete.body')}</p>
          <form action={deleteCollection} className="collection-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={collection.id} />
            <label className="check-field">
              <input type="checkbox" name="confirm" value="yes" required />
              <span>{t('delete.confirm')}</span>
            </label>
            <button type="submit" className="btn btn--danger">
              {t('delete.button')}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
