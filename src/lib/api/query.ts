import { claimCategories, claimStatuses, sourceTypes } from '@/lib/domain/enums';
import type { ClaimFilters } from '@/lib/data/claim-params';
import type { SourceFilters } from '@/lib/data/source-params';

export type QueryResult<T> = { ok: true; value: T } | { ok: false; message: string };

const maxPage = 10_000;

// Unlike the website, which quietly drops a filter it does not recognise, the
// API says so: a client that mistypes a value should find out, not receive an
// unfiltered list that looks correct.
function enumParam<const T extends readonly string[]>(
  params: URLSearchParams,
  name: string,
  allowed: T,
  errors: string[],
): T[number] | undefined {
  const raw = params.get(name);
  if (raw === null || raw === '') return undefined;
  const match = allowed.find((value) => value === raw);
  if (match === undefined) {
    errors.push(`"${name}" must be one of: ${allowed.join(', ')}.`);
  }
  return match;
}

function pageParam(params: URLSearchParams, errors: string[]): number {
  const raw = params.get('page');
  if (raw === null || raw === '') return 1;
  const page = /^\d{1,5}$/.test(raw) ? Number(raw) : 0;
  if (page < 1 || page > maxPage) {
    errors.push(`"page" must be a whole number from 1 to ${maxPage}.`);
    return 1;
  }
  return page;
}

export function parseClaimQuery(params: URLSearchParams): QueryResult<ClaimFilters> {
  const errors: string[] = [];
  const category = enumParam(params, 'category', claimCategories, errors);
  const status = enumParam(params, 'status', claimStatuses, errors);
  const page = pageParam(params, errors);
  if (errors.length > 0) return { ok: false, message: errors.join(' ') };
  return { ok: true, value: { category, status, page } };
}

export function parseSourceQuery(params: URLSearchParams): QueryResult<SourceFilters> {
  const errors: string[] = [];
  const type = enumParam(params, 'type', sourceTypes, errors);
  const page = pageParam(params, errors);
  if (errors.length > 0) return { ok: false, message: errors.join(' ') };
  return { ok: true, value: { type, page } };
}
