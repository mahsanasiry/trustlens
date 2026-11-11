import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ClaimPanel } from '@/components/home/claim-panel';
import { getSession } from '@/lib/auth/session';
import { evidencePositions } from '@/lib/domain/enums';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link } from '@/lib/i18n/navigation';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

const principles = ['sideBySide', 'noVerdict', 'checkable'] as const;

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();

  setRequestLocale(locale);
  const [t, tEvidence, tAuth, session] = await Promise.all([
    getTranslations('home'),
    getTranslations('evidence'),
    getTranslations('auth'),
    getSession(),
  ]);

  return (
    <main id="main">
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <h1>{t('title')}</h1>
            <p className="hero__lead">{t('lead')}</p>
            {session ? null : (
              <div className="hero__actions">
                <Link href="/sign-up" className="btn btn--primary">
                  {tAuth('nav.signUp')}
                </Link>
                <Link href="/sign-in" className="btn btn--quiet">
                  {tAuth('nav.signIn')}
                </Link>
              </div>
            )}
          </div>
          <ClaimPanel />
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
            {principles.map((key) => (
              <div key={key}>
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
