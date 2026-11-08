import { type LocaleCode } from './locales';
import { messageNamespaces, type MessageNamespace } from './namespaces';

type NamespaceMessages = Record<string, unknown>;

async function loadNamespace(
  locale: LocaleCode,
  namespace: MessageNamespace,
): Promise<NamespaceMessages> {
  const loaded = (await import(`../../../messages/${locale}/${namespace}.json`)) as {
    default: NamespaceMessages;
  };
  return loaded.default;
}

export async function loadMessages(
  locale: LocaleCode,
  namespaces: readonly MessageNamespace[] = messageNamespaces,
): Promise<Record<string, NamespaceMessages>> {
  const entries = await Promise.all(
    namespaces.map(
      async (namespace) => [namespace, await loadNamespace(locale, namespace)] as const,
    ),
  );
  return Object.fromEntries(entries);
}
