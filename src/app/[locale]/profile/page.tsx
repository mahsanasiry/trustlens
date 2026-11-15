import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProfileForm } from '@/components/profile/profile-form';
import { getSession } from '@/lib/auth/session';
import { isLocaleCode } from '@/lib/i18n/locales';
import { redirect } from '@/lib/i18n/navigation';
import { avatarUrl } from '@/lib/storage/avatar';
import { readSupabaseEnv } from '@/lib/supabase/env';

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'profile' });
  return { title: t('title'), robots: { index: false } };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) return redirect({ href: '/sign-in', locale });

  const t = await getTranslations('profile');

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
        <div className="profile">
          <ProfileForm
            locale={locale}
            displayName={session.displayName}
            pictureUrl={avatarUrl(readSupabaseEnv()?.url, session.avatarPath)}
          />
        </div>
      </div>
    </main>
  );
}
