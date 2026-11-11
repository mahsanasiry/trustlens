import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SignInForm } from '@/components/auth/sign-in-form';
import { getSession } from '@/lib/auth/session';
import { isLocaleCode } from '@/lib/i18n/locales';
import { Link, redirect } from '@/lib/i18n/navigation';

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: SignInPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('signIn.title') };
}

export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();

  setRequestLocale(locale);
  if (await getSession()) redirect({ href: '/', locale });

  const t = await getTranslations('auth');

  return (
    <main id="main" className="auth">
      <div className="container auth__inner">
        <h1>{t('signIn.title')}</h1>
        <p className="auth__lead">{t('signIn.lead')}</p>
        <div className="card">
          <SignInForm />
        </div>
        <p className="auth__switch">
          {t('signIn.prompt')}{' '}
          <Link href="/sign-up" className="link">
            {t('nav.signUp')}
          </Link>
        </p>
      </div>
    </main>
  );
}
