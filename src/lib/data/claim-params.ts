import { z } from 'zod';
import { claimCategories, claimStatuses } from '@/lib/domain/enums';
import { firstValue, optionalEnum, pageNumber, type RawParams } from './params';

export { isEntityId } from './params';

export const claimsPageSize = 12;

export const claimFiltersSchema = z.object({
  category: optionalEnum(claimCategories),
  status: optionalEnum(claimStatuses),
  page: pageNumber,
});

export type ClaimFilters = z.infer<typeof claimFiltersSchema>;

export function parseClaimFilters(raw: RawParams): ClaimFilters {
  return claimFiltersSchema.parse({
    category: firstValue(raw.category),
    status: firstValue(raw.status),
    page: firstValue(raw.page) ?? 1,
  });
}
