export const messageNamespaces = ['common', 'home', 'auth', 'evidence'] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];
