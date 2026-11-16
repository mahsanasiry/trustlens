export const messageNamespaces = [
  'common',
  'home',
  'auth',
  'evidence',
  'claims',
  'sources',
  'search',
  'bookmarks',
  'collections',
  'profile',
  'studio',
  'review',
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];
