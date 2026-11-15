import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClaimPanel } from '@/components/home/claim-panel';
import { CategoryIcon, type IconKind } from '@/components/category-icon';
import { claimCategories, evidencePositions } from '@/lib/domain/enums';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link } from '@/lib/i18n/navigation';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

const principles = [
  { key: 'sideBySide', icon: 'columns' },
  { key: 'noVerdict', icon: 'balance' },
  { key: 'checkable', icon: 'search' },
] as const satisfies readonly { key: string; icon: IconKind }[];

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();

  setRequestLocale(locale);
  const [t, tEvidence, tClaims, tSources] = await Promise.all([
    getTranslations('home'),
    getTranslations('evidence'),
    getTranslations('claims'),
    getTranslations('sources'),
  ]);

  return (
    <main id="main">
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <h1>{t('title')}</h1>
            <p className="hero__lead">{t('lead')}</p>
            <div className="hero__actions">
              <Link href="/claims" className="btn btn--primary">
                {tClaims('title')}
              </Link>
              <Link href="/sources" className="btn btn--quiet">
                {tSources('title')}
              </Link>
            </div>
          </div>
          <ClaimPanel />
        </div>
      </section>

      <section className="section section--tight">
        <div className="container">
          <h2>{tClaims('title')}</h2>
          <p className="section__lead">{tClaims('lead')}</p>
          <div className="category-grid">
            {claimCategories.map((category) => (
              <Link
                key={category}
                href={{ pathname: '/claims', query: { category } }}
                className="category-link"
              >
                <CategoryIcon kind={category} />
                <span>{tClaims(`category.${category}`)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>{t('spectrumTitle')}</h2>
          <div className="position-grid">
            {evidencePositions.map((position) => (
              <div key={position} className={`position position--${position}`}>
                <h3>
                  <span className={`marker marker--${position}`} aria-hidden="true" />
                  {tEvidence(`positions.${position}`)}
                </h3>
                <p>{tEvidence(`help.${position}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--band">
        <div className="container">
          <h2>{t('principlesTitle')}</h2>
          <div className="principles">
            {principles.map(({ key, icon }) => (
              <div key={key} className="principle">
                <CategoryIcon kind={icon} />
                <h3>{t(`principles.${key}.title`)}</h3>
                <p>{t(`principles.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
