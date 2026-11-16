import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PaginationNav } from '@/components/pagination-nav';
import { QueueList } from '@/components/review/queue-list';
import { TypeFilter } from '@/components/review/type-filter';
import { getSession } from '@/lib/auth/session';
import { listReviewQueue } from '@/lib/data/review';
import { parseQueueFilters } from '@/lib/data/review-params';
import type { RawParams } from '@/lib/data/params';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';

interface ReviewPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<RawParams>;
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'review' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  // The queue is for admins; the page does not exist for anyone else.
  if (session.actor.role !== 'admin') notFound();

  const filters = parseQueueFilters(await searchParams);
  const [t, queue] = await Promise.all([
    getTranslations('review'),
    listReviewQueue(filters),
  ]);

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
        <div className="studio-stack">
          <TypeFilter current={filters.type} />
          <section className="card studio-section" aria-label={t('title')}>
            <QueueList items={queue.items} currentUserId={session.actor.id} />
          </section>
          <PaginationNav
            pathname="/review"
            page={queue.page}
            pageCount={queue.pageCount}
            query={filters.type ? { type: filters.type } : {}}
          />
        </div>
      </div>
    </main>
  );
}
