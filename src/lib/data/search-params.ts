import { z } from 'zod';
import { firstValue, optionalEnum, pageNumber, type RawParams } from './params';

export const searchPageSize = 12;
export const searchKinds = ['claim', 'source'] as const;
export type SearchKind = (typeof searchKinds)[number];

const maxQueryLength = 200;

// Collapses whitespace and caps the length by characters, not UTF-16 units, so
// the same text is measured the same way here and in the database function.
export function normaliseQuery(value: string | undefined): string {
  const collapsed = (value ?? '').replace(/\s+/g, ' ').trim();
  return [...collapsed].slice(0, maxQueryLength).join('').trim();
}

// Two characters are the minimum, except for scripts such as Chinese or
// Japanese where a single character can be a whole word.
export function isSearchable(query: string): boolean {
  const characters = [...query];
  if (characters.length >= 2) return true;
  return characters.some((character) => (character.codePointAt(0) ?? 0) > 0x7f);
}

export const searchFiltersSchema = z.object({
  q: z.string(),
  kind: optionalEnum(searchKinds),
  page: pageNumber,
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export function parseSearchFilters(raw: RawParams): SearchFilters {
  return searchFiltersSchema.parse({
    q: normaliseQuery(firstValue(raw.q)),
    kind: firstValue(raw.kind),
    page: firstValue(raw.page) ?? 1,
  });
}
