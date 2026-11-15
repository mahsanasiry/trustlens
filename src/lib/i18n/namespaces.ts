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
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];
