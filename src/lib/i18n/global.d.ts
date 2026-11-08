import type common from '../../../messages/en/common.json';
import type home from '../../../messages/en/home.json';
import type { LocaleCode } from './locales';

declare module 'next-intl' {
  interface AppConfig {
    Locale: LocaleCode;
    Messages: {
      common: typeof common;
      home: typeof home;
    };
  }
}
