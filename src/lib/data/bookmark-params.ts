import { z } from 'zod';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { isLocaleCode, type LocaleCode } from '@/lib/i18n/locales';
import { firstValue, isEntityId, pageNumber, type RawParams } from './params';

export const bookmarksPageSize = 12;
export const bookmarkKinds = ['claim', 'source'] as const;
export type BookmarkKind = (typeof bookmarkKinds)[number];

export function parseBookmarkPage(raw: RawParams): number {
  return pageNumber.parse(firstValue(raw.page) ?? 1);
}

const bookmarkFormSchema = z.object({
  kind: z.enum(bookmarkKinds),
  id: z.string().refine(isEntityId),
  intent: z.enum(['save', 'remove']),
  // A path inside the site, without the locale prefix, to return to afterwards.
  next: z.string().transform((value) => safeRedirectPath(value, '/')),
});

export type BookmarkForm = z.infer<typeof bookmarkFormSchema> & { locale: LocaleCode };

export function parseBookmarkForm(form: FormData): BookmarkForm | null {
  const locale = form.get('locale');
  if (typeof locale !== 'string' || !isLocaleCode(locale)) return null;

  const parsed = bookmarkFormSchema.safeParse({
    kind: form.get('kind'),
    id: form.get('id'),
    intent: form.get('intent'),
    next: form.get('next') ?? '/',
  });
  return parsed.success ? { ...parsed.data, locale } : null;
}
