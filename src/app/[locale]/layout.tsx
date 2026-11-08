import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getFontClassName } from '@/lib/fonts';
import { getDirection, isLocaleCode, localeRegistry, locales } from '@/lib/i18n/locales';
import { loadMessages } from '@/lib/i18n/messages';
import { siteUrl } from '@/lib/site';
import { themeInitScript } from '@/lib/theme/init-script';
import '../globals.css';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocaleLayoutProps, 'params'>): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'home' });
  const languages = Object.fromEntries(locales.map((code) => [code, `/${code}`]));

  return {
    metadataBase: siteUrl,
    title: { default: 'TrustLens', template: '%s | TrustLens' },
    description: t('lead'),
    alternates: {
      canonical: `/${locale}`,
      languages: { ...languages, 'x-default': '/en' },
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();

  setRequestLocale(locale);

  const [fontClassName, messages, t] = await Promise.all([
    getFontClassName(localeRegistry[locale].script),
    loadMessages(locale, ['common', 'home']),
    getTranslations({ locale, namespace: 'common' }),
  ]);

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className={fontClassName}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
