import type auth from '../../../messages/en/auth.json';
import type common from '../../../messages/en/common.json';
import type evidence from '../../../messages/en/evidence.json';
import type home from '../../../messages/en/home.json';
import type { LocaleCode } from './locales';

declare module 'next-intl' {
  interface AppConfig {
    Locale: LocaleCode;
    Messages: {
      auth: typeof auth;
      common: typeof common;
      evidence: typeof evidence;
      home: typeof home;
    };
  }
}
