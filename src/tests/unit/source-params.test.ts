import { describe, expect, it } from 'vitest';
import { parseCompareIds, parseSourceFilters } from '@/lib/data/source-params';
import { countStatuses } from '@/lib/data/assessments';

const a = '3f2a9c1e-84d7-d5b0-b2c4-9a1f0e7d6c5b';
const b = '0a1b2c3d-1111-2222-3333-444455556666';
const c = '0a1b2c3d-1111-2222-3333-444455556667';
const d = '0a1b2c3d-1111-2222-3333-444455556668';
const e = '0a1b2c3d-1111-2222-3333-444455556669';

describe('parseSourceFilters', () => {
  it('defaults to the first page with no type', () => {
    expect(parseSourceFilters({})).toEqual({ type: undefined, page: 1 });
  });

  it('accepts a known type and drops an unknown one', () => {
    expect(parseSourceFilters({ type: 'dataset', page: '2' })).toEqual({
      type: 'dataset',
      page: 2,
    });
    expect(parseSourceFilters({ type: 'podcast' }).type).toBeUndefined();
  });
});

describe('parseCompareIds', () => {
  it('reads a single id, which the browser sends as a string', () => {
    expect(parseCompareIds(a)).toEqual({ ids: [a], truncated: false });
  });

  it('keeps the order chosen and removes duplicates', () => {
    expect(parseCompareIds([b, a, b]).ids).toEqual([b, a]);
  });

  it('ignores values that are not ids', () => {
    expect(parseCompareIds([a, 'nope', "1' or '1'='1"]).ids).toEqual([a]);
    expect(parseCompareIds(undefined)).toEqual({ ids: [], truncated: false });
  });

  it('caps the selection at four and says so', () => {
    expect(parseCompareIds([a, b, c, d, e])).toEqual({
      ids: [a, b, c, d],
      truncated: true,
    });
  });
});

describe('countStatuses', () => {
  it('counts every status, including empty ones', () => {
    expect(
      countStatuses([
        { criterion: 'citations_present', status: 'verified', notes: '' },
        { criterion: 'publication_date', status: 'verified', notes: '' },
        { criterion: 'conflict_of_interest', status: 'not_verified', notes: '' },
      ]),
    ).toEqual({ verified: 2, partially_verified: 0, not_verified: 1, not_applicable: 0 });
  });
});
