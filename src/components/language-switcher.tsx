'use client';

import type { ChangeEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { isLocaleCode, localeRegistry, locales } from '@/lib/i18n/locales';
import { usePathname, useRouter } from '@/lib/i18n/navigation';

// A native select: it works with every script, with keyboard and screen
// readers, and without a menu library. Each language is named in itself.
export function LanguageSwitcher() {
  const t = useTranslations('common.language');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!isLocaleCode(next)) return;
    router.replace(`${pathname}${window.location.search}`, { locale: next });
  }

  return (
    <label className="lang-switch">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
      </svg>
      <span className="visually-hidden">{t('label')}</span>
      <select value={locale} onChange={onChange}>
        {locales.map((code) => (
          <option key={code} value={code} lang={code} dir={localeRegistry[code].dir}>
            {localeRegistry[code].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
