import { z } from 'zod';
import { claimCategories, claimStatuses, sourceTypes } from '@/lib/domain/enums';

// The row shape shared by every function that lists claims and sources
// together: search and the reader's saved items.
const claimResult = z.object({
  kind: z.literal('claim'),
  id: z.string(),
  title: z.string(),
  language: z.string(),
  category: z.enum(claimCategories),
  status: z.enum(claimStatuses),
});

const sourceResult = z.object({
  kind: z.literal('source'),
  id: z.string(),
  title: z.string(),
  language: z.string(),
  source_type: z.enum(sourceTypes),
  publisher: z.string(),
});

export type ResultItem = z.infer<typeof claimResult> | z.infer<typeof sourceResult>;

export const resultItemsSchema = z.array(
  z.discriminatedUnion('kind', [claimResult, sourceResult]),
);
const totalsSchema = z.array(z.object({ total_count: z.number() }));

export interface ResultPage {
  items: ResultItem[];
  total: number;
  page: number;
  pageCount: number;
}

export function emptyResultPage(page: number): ResultPage {
  return { items: [], total: 0, page, pageCount: 0 };
}

export function toResultPage(data: unknown, page: number, pageSize: number): ResultPage {
  // Every row carries the same total, so the first one is enough.
  const total = totalsSchema.parse(data)[0]?.total_count ?? 0;
  return {
    items: resultItemsSchema.parse(data),
    total,
    page,
    pageCount: Math.ceil(total / pageSize),
  };
}
