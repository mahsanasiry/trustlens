import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { BookmarkButton } from '@/components/bookmarks/bookmark-button';
import { PaginationNav } from '@/components/pagination-nav';
import { SearchResultCard } from '@/components/search/search-result-card';
import { getSession } from '@/lib/auth/session';
import { parseBookmarkPage } from '@/lib/data/bookmark-params';
import { listBookmarks } from '@/lib/data/bookmarks';
import { parseRemoved } from '@/lib/data/undo-params';
import { setBookmark } from './actions';
import { UndoNotice } from '@/components/undo-notice';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface BookmarksPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({
  params,
}: BookmarksPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'bookmarks' });
  return { title: t('title'), robots: { index: false } };
}

export default async function BookmarksPage({
  params,
  searchParams,
}: BookmarksPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });

  const query = await searchParams;
  const page = parseBookmarkPage(query);
  const removed = parseRemoved(query);
  const [t, format, result] = await Promise.all([
    getTranslations('bookmarks'),
    getFormatter(),
    listBookmarks(page),
  ]);

  // Removing the last item on a page leaves that page empty; go back to the start.
  if (page > 1 && result.items.length === 0) {
    return redirect({ href: '/bookmarks', locale });
  }

  const next = page > 1 ? `/bookmarks?page=${page}` : '/bookmarks';

  return (
    <main id="main" className="page">
      {removed ? (
        <UndoNotice
          message={t('removedNotice')}
          action={setBookmark}
          fields={{ kind: removed.kind, id: removed.id, intent: 'save', next }}
        />
      ) : null}
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <h1>{t('title')}</h1>
            <p className="page__lead">{t('lead')}</p>
          </header>
        </div>
      </section>

      <div className="container page__body">
        <p className="result-count" role="status">
          {t('resultCount', { count: format.number(result.total) })}
        </p>

        {result.items.length > 0 ? (
          <ul className="search-results">
            {result.items.map((item) => (
              <SearchResultCard
                key={`${item.kind}-${item.id}`}
                result={item}
                action={
                  <BookmarkButton
                    kind={item.kind}
                    id={item.id}
                    saved
                    signedIn
                    next={next}
                  />
                }
              />
            ))}
          </ul>
        ) : (
          <div className="empty">
            <h2>{t('empty.title')}</h2>
            <p>{t('empty.body')}</p>
          </div>
        )}

        <PaginationNav pathname="/bookmarks" page={page} pageCount={result.pageCount} />
      </div>
    </main>
  );
}
