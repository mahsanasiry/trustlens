import { getTranslations } from 'next-intl/server';
import { getSession } from '@/lib/auth/session';
import { Link } from '@/lib/i18n/navigation';
import { avatarUrl } from '@/lib/storage/avatar';
import { readSupabaseEnv } from '@/lib/supabase/env';
import { SignOutButton } from './auth/sign-out-button';
import { BrandMark } from './brand-mark';
import { LanguageSwitcher } from './language-switcher';
import { NavLink } from './nav-link';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export async function SiteHeader() {
  const [t, tClaims, tSources, tSearch, tBookmarks, tCollections, tProfile, session] =
    await Promise.all([
      getTranslations('auth'),
      getTranslations('claims'),
      getTranslations('sources'),
      getTranslations('search'),
      getTranslations('bookmarks'),
      getTranslations('collections'),
      getTranslations('profile'),
      getSession(),
    ]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand">
          <BrandMark />
          TrustLens
        </Link>
        <nav aria-label={t('nav.label')} className="nav">
          <NavLink href="/claims">{tClaims('title')}</NavLink>
          <NavLink href="/sources">{tSources('title')}</NavLink>
          <NavLink href="/search">{tSearch('title')}</NavLink>
          <LanguageSwitcher />
          <ThemeToggle />
          {session ? (
            <UserMenu
              name={session.displayName}
              role={t(`roles.${session.actor.role}`)}
              label={t('nav.signedInAs', { name: session.displayName })}
              avatarUrl={avatarUrl(readSupabaseEnv()?.url, session.avatarPath)}
              items={[
                { href: '/profile', label: tProfile('title') },
                { href: '/bookmarks', label: tBookmarks('title') },
                { href: '/collections', label: tCollections('title') },
              ]}
            >
              <SignOutButton />
            </UserMenu>
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
