import { z } from 'zod';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { isLocaleCode, type LocaleCode } from '@/lib/i18n/locales';
import { firstValue, isEntityId, pageNumber, type RawParams } from './params';

export const collectionsPageSize = 12;
export const collectionItemsPageSize = 20;

// "public" exists in the database for a future discovery page, but nothing
// lists public collections yet, so it cannot be chosen here.
export const editableVisibilities = ['private', 'unlisted'] as const;
export type EditableVisibility = (typeof editableVisibilities)[number];

export function parseCollectionPage(raw: RawParams): number {
  return pageNumber.parse(firstValue(raw.page) ?? 1);
}

const entityId = z.string().refine(isEntityId);

const fields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  visibility: z.enum(editableVisibilities),
};

const forms = {
  create: z.object(fields),
  update: z.object({ id: entityId, ...fields }),
  delete: z.object({ id: entityId, confirm: z.literal('yes') }),
  add: z.object({
    collection_id: entityId,
    kind: z.enum(['claim', 'source']),
    id: entityId,
    next: z.string().transform((value) => safeRedirectPath(value, '/')),
  }),
  item: z.object({
    collection_id: entityId,
    item_id: entityId,
    intent: z.enum(['remove', 'up', 'down']),
    page: z.string().optional(),
  }),
};

type WithLocale<T> = T & { locale: LocaleCode };

// Every form carries the reader's locale. Anything missing or malformed gives
// null, and the action answers it with a 404.
function parseWith<T extends z.ZodType>(
  schema: T,
  form: FormData,
  defaults: Record<string, string> = {},
): WithLocale<z.infer<T>> | null {
  const locale = form.get('locale');
  if (typeof locale !== 'string' || !isLocaleCode(locale)) return null;

  const values: Record<string, string> = { ...defaults };
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') values[key] = value;
  }

  const parsed = schema.safeParse(values);
  return parsed.success ? Object.assign({}, parsed.data, { locale }) : null;
}

const emptyDescription = { description: '' };

export const parseCreateForm = (form: FormData) =>
  parseWith(forms.create, form, emptyDescription);
export const parseUpdateForm = (form: FormData) =>
  parseWith(forms.update, form, emptyDescription);
export const parseDeleteForm = (form: FormData) => parseWith(forms.delete, form);
export const parseAddForm = (form: FormData) => parseWith(forms.add, form);
export const parseItemForm = (form: FormData) => parseWith(forms.item, form);
