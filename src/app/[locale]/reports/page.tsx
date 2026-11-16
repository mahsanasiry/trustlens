import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { getSession } from '@/lib/auth/session';
import type { ReportTarget } from '@/lib/data/report-params';
import { listMyReports } from '@/lib/data/reports';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link, redirect } from '@/lib/i18n/navigation';

// Evidence has no page of its own; it is shown inside its claim.
function targetHref(type: ReportTarget, id: string): string | null {
  if (type === 'claim') return `/claims/${id}`;
  if (type === 'source') return `/sources/${id}`;
  return null;
}

interface ReportsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ReportsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'reports' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });

  const [t, tKinds, tTypes, format, reports] = await Promise.all([
    getTranslations('reports'),
    getTranslations('review.reportKinds'),
    getTranslations('review.types'),
    getFormatter(),
    listMyReports(session.actor.id),
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
        <section className="card studio-section" aria-label={t('title')}>
          {reports.length === 0 ? (
            <p className="work-list__empty">{t('empty')}</p>
          ) : (
            <ul className="work-list">
              {reports.map((report) => (
                <li key={report.id} className="work-item">
                  <div className="work-item__main">
                    <h3 className="work-item__title">
                      {report.targetTitle &&
                      targetHref(report.targetType, report.targetId) ? (
                        <Link
                          href={targetHref(report.targetType, report.targetId) ?? '/'}
                          className="work-item__link"
                          dir="auto"
                        >
                          {report.targetTitle}
                        </Link>
                      ) : (
                        <span dir="auto">
                          {report.targetTitle ?? tTypes(report.targetType)}
                        </span>
                      )}
                    </h3>
                    <p className="work-item__meta">
                      {tKinds(report.kind)}
                      {' · '}
                      {format.dateTime(new Date(report.createdAt), {
                        dateStyle: 'medium',
                      })}
                    </p>
                    <p className="work-item__meta" dir="auto">
                      {report.reason}
                    </p>
                  </div>
                  <span className="state-tag">{t(`status.${report.status}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
