import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/auth/session';
import { Link } from '@/lib/i18n/navigation';
import { SignOutButton } from './auth/sign-out-button';
import { BrandMark } from './brand-mark';

export async function SiteHeader() {
  const [t, session] = await Promise.all([getTranslations('auth'), getSession()]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand">
          <BrandMark />
          TrustLens
        </Link>
        <nav aria-label={t('nav.label')} className="nav">
          {session ? (
            <>
              <span className="user-chip">
                <span className="visually-hidden">
                  {t('nav.signedInAs', { name: session.displayName })}
                </span>
                <span aria-hidden="true">{session.displayName}</span>
                <span className="role-badge">{t(`roles.${session.actor.role}`)}</span>
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/sign-in" className="btn btn--quiet btn--small">
                {t('nav.signIn')}
              </Link>
              <Link href="/sign-up" className="btn btn--primary btn--small">
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
