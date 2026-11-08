import { getRequestConfig } from 'next-intl/server';
import { isLocaleCode, defaultLocale } from './locales';
import { loadMessages } from './messages';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocaleCode(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
