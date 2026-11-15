import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { EvidenceBar } from '@/components/claims/evidence-bar';
import { EvidenceItem } from '@/components/claims/evidence-item';
import { StatusBadge } from '@/components/claims/status-badge';
import { getClaim } from '@/lib/data/claims';
import { countPositions } from '@/lib/data/position-counts';
import { evidencePositions } from '@/lib/domain/enums';
import { BookmarkButton } from '@/components/bookmarks/bookmark-button';
import { AddToCollection } from '@/components/collections/add-to-collection';
import { getSession } from '@/lib/auth/session';
import { isBookmarked } from '@/lib/data/bookmarks';
import { listCollectionChoices } from '@/lib/data/collections';
import { firstValue } from '@/lib/data/params';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link } from '@/lib/i18n/navigation';
import { safeHttpUrl } from '@/lib/safe-url';

interface ClaimPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: ClaimPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) return {};
  const view = await getClaim(id);
  return view ? { title: view.claim.title } : {};
}

export default async function ClaimPage({ params, searchParams }: ClaimPageProps) {
  const { locale, id } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const [view, t, tEvidence, format] = await Promise.all([
    getClaim(id),
    getTranslations('claims'),
    getTranslations('evidence'),
    getFormatter(),
  ]);
  if (!view) notFound();

  const { claim, statusChanges, related } = view;
  const session = await getSession();
  const choices = session ? await listCollectionChoices() : [];
  const added = firstValue((await searchParams).added) === '1';
  const saved = session ? await isBookmarked('claim', claim.id) : false;
  const originHref = safeHttpUrl(claim.origin_url);
  const date = (value: string) =>
    format.dateTime(new Date(value), { dateStyle: 'medium', timeZone: 'UTC' });

  return (
    <main id="main" className="page">
      <section className="page-hero">
        <div className="container container--narrow">
          <Link href="/claims" className="back-link">
            {t('detail.back')}
          </Link>

          <header className="claim-head">
            <div className="claim-card__meta">
              <span className="claim-card__category">
                {t(`category.${claim.category}`)}
              </span>
              <StatusBadge status={claim.status} />
            </div>
            <h1 className="claim-head__title" lang={claim.language} dir="auto">
              {claim.title}
            </h1>
            {claim.description ? (
              <p className="claim-head__description" lang={claim.language} dir="auto">
                {claim.description}
              </p>
            ) : null}
            <p className="page__note">{t('statusNote')}</p>

            <BookmarkButton
              kind="claim"
              id={claim.id}
              saved={saved}
              signedIn={session !== null}
              next={`/claims/${claim.id}`}
            />

            {session ? (
              <AddToCollection
                kind="claim"
                id={claim.id}
                choices={choices}
                next={`/claims/${claim.id}`}
                added={added}
              />
            ) : null}

            <dl className="facts">
              {claim.origin ? (
                <div>
                  <dt>{t('detail.origin')}</dt>
                  <dd lang={claim.language} dir="auto">
                    {originHref ? (
                      <a href={originHref} rel="noopener noreferrer" target="_blank">
                        {claim.origin}
                      </a>
                    ) : (
                      claim.origin
                    )}
                  </dd>
                </div>
              ) : null}
              {claim.first_appeared_on ? (
                <div>
                  <dt>{t('detail.firstAppeared')}</dt>
                  <dd>{date(claim.first_appeared_on)}</dd>
                </div>
              ) : null}
            </dl>
          </header>
        </div>
      </section>

      <div className="container container--narrow page__body">
        <section aria-labelledby="evidence-heading" className="detail-section">
          <h2 id="evidence-heading">{t('detail.evidenceTitle')}</h2>
          {claim.evidence.length === 0 ? (
            <p className="muted">{t('detail.noEvidence')}</p>
          ) : (
            <>
              <EvidenceBar counts={countPositions(claim.evidence)} />
              {evidencePositions.map((position) => {
                const items = claim.evidence.filter((item) => item.position === position);
                if (items.length === 0) return null;
                return (
                  <section
                    key={position}
                    aria-labelledby={`group-${position}`}
                    className={`evidence-group pos-${position}`}
                  >
                    <h3 id={`group-${position}`}>
                      <span className={`marker marker--${position}`} aria-hidden="true" />
                      {tEvidence(`positions.${position}`)}
                    </h3>
                    <p className="muted">{tEvidence(`help.${position}`)}</p>
                    <ul className="evidence-items">
                      {items.map((item) => (
                        <EvidenceItem key={item.id} item={item} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </section>

        {statusChanges.length > 0 ? (
          <section aria-labelledby="history-heading" className="detail-section">
            <h2 id="history-heading">{t('detail.statusHistory')}</h2>
            <ol className="timeline">
              {statusChanges.map((change) => (
                <li key={change.id}>
                  <p className="timeline__change">
                    <StatusBadge status={change.from_status} />
                    <span aria-hidden="true" className="timeline__arrow" />
                    <StatusBadge status={change.to_status} />
                  </p>
                  <p className="timeline__reason" lang={claim.language} dir="auto">
                    {change.reason}
                  </p>
                  <p className="muted">{date(change.created_at)}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section aria-labelledby="related-heading" className="detail-section">
            <h2 id="related-heading">{t('detail.relatedClaims')}</h2>
            <ul className="related">
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={`/claims/${item.id}`} lang={item.language} dir="auto">
                    {item.title}
                  </Link>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="muted claim-foot">
          <span>{t('detail.version', { version: format.number(claim.version) })}</span>
          <span>{t('detail.updated', { date: date(claim.updated_at) })}</span>
        </p>
      </div>
    </main>
  );
}
