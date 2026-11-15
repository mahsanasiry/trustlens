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
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];
