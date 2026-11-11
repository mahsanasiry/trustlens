import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { getSession } from '@/lib/auth/session';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link, redirect } from '@/lib/i18n/navigation';

interface SignUpPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SignUpPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('signUp.title') };
}

export default async function SignUpPage({ params }: SignUpPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();

  setRequestLocale(locale);
  if (await getSession()) redirect({ href: '/', locale });

  const t = await getTranslations('auth');

  return (
    <main id="main" className="auth">
      <div className="container auth__inner">
        <h1>{t('signUp.title')}</h1>
        <p className="auth__lead">{t('signUp.lead')}</p>
        <div className="card">
          <SignUpForm />
        </div>
        <p className="auth__switch">
          {t('signUp.prompt')}{' '}
          <Link href="/sign-in" className="link">
            {t('nav.signIn')}
          </Link>
        </p>
      </div>
    </main>
  );
}
