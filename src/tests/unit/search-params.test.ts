import { describe, expect, it } from 'vitest';
import {
  isSearchable,
  normaliseQuery,
  parseSearchFilters,
} from '@/lib/data/search-params';

describe('normaliseQuery', () => {
  it('collapses whitespace and trims', () => {
    expect(normaliseQuery('  rent \n  control\t')).toBe('rent control');
  });

  it('treats a missing query as empty', () => {
    expect(normaliseQuery(undefined)).toBe('');
  });

  it('caps the length by characters', () => {
    expect(normaliseQuery('a'.repeat(500))).toHaveLength(200);
    expect([...normaliseQuery('水'.repeat(500))]).toHaveLength(200);
  });
});

describe('isSearchable', () => {
  it('needs two characters in Latin script', () => {
    expect(isSearchable('')).toBe(false);
    expect(isSearchable('a')).toBe(false);
    expect(isSearchable('ab')).toBe(true);
  });

  it('accepts a single character outside ASCII', () => {
    expect(isSearchable('水')).toBe(true);
    expect(isSearchable('é')).toBe(true);
  });
});

describe('parseSearchFilters', () => {
  it('reads the query, kind and page', () => {
    expect(parseSearchFilters({ q: ' housing ', kind: 'claim', page: '3' })).toEqual({
      q: 'housing',
      kind: 'claim',
      page: 3,
    });
  });

  it('drops an unknown kind and a bad page', () => {
    expect(parseSearchFilters({ q: 'x', kind: 'person', page: '-4' })).toEqual({
      q: 'x',
      kind: undefined,
      page: 1,
    });
  });

  it('uses the first value when a parameter repeats', () => {
    expect(parseSearchFilters({ q: ['one', 'two'] }).q).toBe('one');
  });

  it('defaults to an empty query on page one', () => {
    expect(parseSearchFilters({})).toEqual({ q: '', kind: undefined, page: 1 });
  });
});
