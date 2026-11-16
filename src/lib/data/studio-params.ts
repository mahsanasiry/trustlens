import { z } from 'zod';
import { claimCategories, sourceTypes } from '@/lib/domain/enums';
import { isLocaleCode, locales, type LocaleCode } from '@/lib/i18n/locales';
import { isEntityId } from './params';

export const studioKinds = ['claim', 'source'] as const;
export type StudioKind = (typeof studioKinds)[number];

export function isStudioKind(value: string): value is StudioKind {
  return (studioKinds as readonly string[]).includes(value);
}

export const maxKeywords = 20;
export const maxAuthors = 30;

export type StudioError =
  'invalid' | 'dates' | 'locked' | 'forbidden' | 'nochange' | 'failed';

export interface DuplicateMatch {
  id: string;
  title: string;
  publisher: string;
  reason: 'same_url' | 'similar_title';
}

// What a studio form shows after an action. The id changes with every answer so
// the page can tell a new result from one it has already shown.
//
// A form reset follows every action, so an answer that asks the person to fix
// something carries back what they typed; otherwise the fields would empty.
export type StudioState =
  | { id: number; status: 'idle' }
  | { id: number; status: 'saved'; message: 'saved' | 'submitted' | 'proposed' }
  | { id: number; status: 'error'; error: StudioError; values: Record<string, string> }
  | {
      id: number;
      status: 'duplicate';
      matches: DuplicateMatch[];
      values: Record<string, string>;
    };

export function echoValues(form: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string' && key !== 'locale' && key !== 'id')
      values[key] = value;
  }
  return values;
}

// The database counts characters, not UTF-16 units.
function characters(value: string): number {
  return Array.from(value).length;
}

export const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((value) => characters(value) >= min && characters(value) <= max);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .refine((value) => characters(value) <= max);

const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .refine(
    (value) =>
      value === null || (/^https?:\/\/\S+$/i.test(value) && value.length <= 2048),
  );

const requiredUrl = z
  .string()
  .trim()
  .refine((value) => /^https?:\/\/\S+$/i.test(value) && value.length <= 2048);

const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string): boolean {
  if (!dateOnly.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const optionalDate = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .refine((value) => value === null || isRealDate(value));

const language = z.string().refine((value) => isLocaleCode(value));

// Lists come from one text box: commas or new lines separate the entries, a
// repeated entry is kept once, and blank ones are dropped.
export function splitList(
  raw: string,
  separators: RegExp,
  maxItems: number,
  maxLength: number,
) {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of raw.split(separators)) {
    const item = part.trim().replace(/\s+/g, ' ');
    if (item === '' || characters(item) > maxLength) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items.slice(0, maxItems);
}

// Latin, Arabic and CJK commas, semicolons and line breaks.
export const parseKeywords = (raw: string) =>
  splitList(raw, /[,;\n\r،؛，、]+/, maxKeywords, 60);
export const parseAuthors = (raw: string) => splitList(raw, /[\n\r]+/, maxAuthors, 120);

const claimSchema = z.object({
  title: text(3, 300),
  description: optionalText(5000),
  category: z.enum(claimCategories),
  origin: optionalText(1000),
  origin_url: optionalUrl,
  first_appeared_on: optionalDate,
  language,
});

const sourceSchema = z.object({
  title: text(3, 400),
  publisher: text(1, 200),
  url: requiredUrl,
  published_on: optionalDate,
  accessed_on: optionalDate,
  type: z.enum(sourceTypes),
  language,
});

export interface ClaimInput {
  title: string;
  description: string;
  category: (typeof claimCategories)[number];
  origin: string;
  origin_url: string | null;
  first_appeared_on: string | null;
  keywords: string[];
  language: LocaleCode;
}

export interface SourceInput {
  title: string;
  publisher: string;
  url: string;
  authors: string[];
  published_on: string | null;
  accessed_on: string | null;
  type: (typeof sourceTypes)[number];
  language: LocaleCode;
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: Extract<StudioError, 'invalid' | 'dates'> };

export function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function parseClaimInput(form: FormData): ParseResult<ClaimInput> {
  const parsed = claimSchema.safeParse({
    title: field(form, 'title'),
    description: field(form, 'description'),
    category: field(form, 'category'),
    origin: field(form, 'origin'),
    origin_url: field(form, 'origin_url'),
    first_appeared_on: field(form, 'first_appeared_on'),
    language: field(form, 'language'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };
  return {
    ok: true,
    value: {
      ...parsed.data,
      keywords: parseKeywords(field(form, 'keywords')),
      language: parsed.data.language as LocaleCode,
    },
  };
}

export function parseSourceInput(form: FormData): ParseResult<SourceInput> {
  const parsed = sourceSchema.safeParse({
    title: field(form, 'title'),
    publisher: field(form, 'publisher'),
    url: field(form, 'url'),
    published_on: field(form, 'published_on'),
    accessed_on: field(form, 'accessed_on'),
    type: field(form, 'type'),
    language: field(form, 'language'),
  });
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const { published_on, accessed_on } = parsed.data;
  // Matches the database check; ISO dates compare correctly as text.
  if (published_on && accessed_on && accessed_on < published_on) {
    return { ok: false, error: 'dates' };
  }
  return {
    ok: true,
    value: {
      ...parsed.data,
      authors: parseAuthors(field(form, 'authors')),
      language: parsed.data.language as LocaleCode,
    },
  };
}

export function readLocale(form: FormData): LocaleCode | null {
  const locale = form.get('locale');
  return typeof locale === 'string' && isLocaleCode(locale) ? locale : null;
}

export function readEntityId(form: FormData): string | null {
  const id = form.get('id');
  return typeof id === 'string' && isEntityId(id) ? id : null;
}

export const languageChoices = locales;
