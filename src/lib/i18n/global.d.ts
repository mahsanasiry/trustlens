import type authoring from '../../../messages/en/authoring.json';
import type auth from '../../../messages/en/auth.json';
import type bookmarks from '../../../messages/en/bookmarks.json';
import type claims from '../../../messages/en/claims.json';
import type collections from '../../../messages/en/collections.json';
import type common from '../../../messages/en/common.json';
import type evidence from '../../../messages/en/evidence.json';
import type home from '../../../messages/en/home.json';
import type profile from '../../../messages/en/profile.json';
import type reports from '../../../messages/en/reports.json';
import type review from '../../../messages/en/review.json';
import type studio from '../../../messages/en/studio.json';
import type search from '../../../messages/en/search.json';
import type sources from '../../../messages/en/sources.json';
import type { LocaleCode } from './locales';

declare module 'next-intl' {
  interface AppConfig {
    Locale: LocaleCode;
    Messages: {
      auth: typeof auth;
      authoring: typeof authoring;
      bookmarks: typeof bookmarks;
      claims: typeof claims;
      collections: typeof collections;
      common: typeof common;
      evidence: typeof evidence;
      home: typeof home;
      profile: typeof profile;
      reports: typeof reports;
      review: typeof review;
      search: typeof search;
      studio: typeof studio;
      sources: typeof sources;
    };
  }
}
