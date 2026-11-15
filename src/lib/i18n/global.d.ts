import type auth from '../../../messages/en/auth.json';
import type bookmarks from '../../../messages/en/bookmarks.json';
import type claims from '../../../messages/en/claims.json';
import type collections from '../../../messages/en/collections.json';
import type common from '../../../messages/en/common.json';
import type evidence from '../../../messages/en/evidence.json';
import type home from '../../../messages/en/home.json';
import type search from '../../../messages/en/search.json';
import type sources from '../../../messages/en/sources.json';
import type { LocaleCode } from './locales';

declare module 'next-intl' {
  interface AppConfig {
    Locale: LocaleCode;
    Messages: {
      auth: typeof auth;
      bookmarks: typeof bookmarks;
      claims: typeof claims;
      collections: typeof collections;
      common: typeof common;
      evidence: typeof evidence;
      home: typeof home;
      search: typeof search;
      sources: typeof sources;
    };
  }
}
