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
  'authoring',
] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];
