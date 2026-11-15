import { z } from 'zod';
import { sourceTypes } from '@/lib/domain/enums';
import {
  firstValue,
  isEntityId,
  optionalEnum,
  pageNumber,
  type RawParams,
} from './params';

export const sourcesPageSize = 12;
export const compareMin = 2;
export const compareMax = 4;

export const sourceFiltersSchema = z.object({
  type: optionalEnum(sourceTypes),
  page: pageNumber,
});

export type SourceFilters = z.infer<typeof sourceFiltersSchema>;

export function parseSourceFilters(raw: RawParams): SourceFilters {
  return sourceFiltersSchema.parse({
    type: firstValue(raw.type),
    page: firstValue(raw.page) ?? 1,
  });
}

export interface CompareSelection {
  ids: string[];
  truncated: boolean;
}

// The compare form is a plain GET with one "ids" field per checked box, so
// the value can arrive as a single string, a list, or not at all.
export function parseCompareIds(value: string | string[] | undefined): CompareSelection {
  const list = value === undefined ? [] : Array.isArray(value) ? value : [value];
  const unique = [...new Set(list.filter(isEntityId).map((id) => id.toLowerCase()))];
  return { ids: unique.slice(0, compareMax), truncated: unique.length > compareMax };
}
