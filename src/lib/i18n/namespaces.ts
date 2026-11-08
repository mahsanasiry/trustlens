export const messageNamespaces = ['common', 'home'] as const;

export type MessageNamespace = (typeof messageNamespaces)[number];
