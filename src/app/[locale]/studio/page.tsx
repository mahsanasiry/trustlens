import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WorkList } from '@/components/studio/work-list';
import { LiveRefresh } from '@/components/live-refresh';
import { getSession } from '@/lib/auth/session';
import { listMyWork } from '@/lib/data/studio';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link, redirect } from '@/lib/i18n/navigation';

interface StudioPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: StudioPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'studio' });
  return { title: t('title'), robots: { index: false } };
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });
  // The workspace is for researchers and admins; the page does not exist for
  // anyone else.
  if (session.actor.role === 'user') notFound();

  const [t, work] = await Promise.all([
    getTranslations('studio'),
    listMyWork(session.actor.id),
  ]);

  return (
    <main id="main" className="page">
      <LiveRefresh
        name="studio-work"
        tables={['claims', 'sources', 'evidence', 'source_assessments']}
        filter={`author_id=eq.${session.actor.id}`}
      />
      <section className="page-hero">
        <div className="container">
          <header className="page__header">
            <h1>{t('title')}</h1>
            <p className="page__lead">{t('lead')}</p>
          </header>
        </div>
      </section>

      <div className="container page__body">
        <div className="studio-grid">
          <section aria-labelledby="studio-claims" className="card studio-section">
            <header className="studio-section__header">
              <h2 id="studio-claims">{t('sections.claims')}</h2>
              <Link href="/studio/claims/new" className="btn btn--primary">
                {t('new.claim')}
              </Link>
            </header>
            <WorkList kind="claim" items={work.claims} />
          </section>

          <section aria-labelledby="studio-sources" className="card studio-section">
            <header className="studio-section__header">
              <h2 id="studio-sources">{t('sections.sources')}</h2>
              <Link href="/studio/sources/new" className="btn btn--primary">
                {t('new.source')}
              </Link>
            </header>
            <WorkList kind="source" items={work.sources} />
          </section>
        </div>
      </div>
    </main>
  );
}
