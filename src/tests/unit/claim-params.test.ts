import { describe, expect, it } from 'vitest';
import { isEntityId, parseClaimFilters } from '@/lib/data/claim-params';
import { countPositions } from '@/lib/data/position-counts';

describe('parseClaimFilters', () => {
  it('defaults to the first page with no filters', () => {
    expect(parseClaimFilters({})).toEqual({
      category: undefined,
      status: undefined,
      page: 1,
    });
  });

  it('accepts known filters and a page number', () => {
    expect(
      parseClaimFilters({ category: 'science', status: 'under_review', page: '3' }),
    ).toEqual({ category: 'science', status: 'under_review', page: 3 });
  });

  it('treats empty form fields as no filter', () => {
    expect(parseClaimFilters({ category: '', status: '' }).category).toBeUndefined();
  });

  it('drops unknown values instead of failing', () => {
    const filters = parseClaimFilters({
      category: 'sports',
      status: 'true',
      page: 'abc',
    });
    expect(filters).toEqual({ category: undefined, status: undefined, page: 1 });
  });

  it('rejects page numbers below one and fractions', () => {
    expect(parseClaimFilters({ page: '0' }).page).toBe(1);
    expect(parseClaimFilters({ page: '-4' }).page).toBe(1);
    expect(parseClaimFilters({ page: '2.5' }).page).toBe(1);
  });

  it('uses the first value when a parameter repeats', () => {
    expect(parseClaimFilters({ category: ['education', 'science'] }).category).toBe(
      'education',
    );
  });
});

describe('isEntityId', () => {
  it('accepts hash-derived ids with any version nibble', () => {
    expect(isEntityId('3f2a9c1e-84d7-d5b0-b2c4-9a1f0e7d6c5b')).toBe(true);
  });

  it('rejects anything that is not an id', () => {
    expect(isEntityId('not-an-id')).toBe(false);
    expect(isEntityId("1' or '1'='1")).toBe(false);
    expect(isEntityId('')).toBe(false);
  });
});

describe('countPositions', () => {
  it('counts every position, including empty ones', () => {
    expect(
      countPositions([
        { position: 'supports' },
        { position: 'supports' },
        { position: 'context' },
      ]),
    ).toEqual({ supports: 2, context: 1, contradicts: 0 });
  });
});
