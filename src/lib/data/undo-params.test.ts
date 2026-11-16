import { describe, expect, it } from 'vitest';
import { parseRemoved, removedItem, withRemoved } from './undo-params';

const id = '11111111-2222-3333-4444-555555555555';

describe('parseRemoved', () => {
  it('reads a kind and an id', () => {
    expect(parseRemoved({ removed: `claim.${id}` })).toEqual({ kind: 'claim', id });
    expect(parseRemoved({ removed: `source.${id}` })).toEqual({ kind: 'source', id });
  });

  it('uses the first value when the parameter repeats', () => {
    expect(parseRemoved({ removed: [`claim.${id}`, `source.${id}`] })).toEqual({
      kind: 'claim',
      id,
    });
  });

  it.each([
    ['nothing', {}],
    ['an unknown kind', { removed: `evidence.${id}` }],
    ['an id that is not one', { removed: 'claim.nope' }],
    ['a missing id', { removed: 'claim' }],
    ['extra parts', { removed: `claim.${id}.more` }],
  ])('ignores %s', (_label, raw) => {
    expect(parseRemoved(raw)).toBeNull();
  });
});

describe('withRemoved', () => {
  it('starts the query when there is none', () => {
    expect(withRemoved('/bookmarks', { kind: 'claim', id })).toBe(
      `/bookmarks?removed=claim.${id}`,
    );
  });

  it('adds to an existing query', () => {
    expect(withRemoved('/bookmarks?page=2', { kind: 'source', id })).toBe(
      `/bookmarks?page=2&removed=source.${id}`,
    );
  });
});

describe('removedItem', () => {
  it('names a removed claim or source', () => {
    expect(removedItem({ claim_id: id, source_id: null })).toEqual({ kind: 'claim', id });
    expect(removedItem({ claim_id: null, source_id: id })).toEqual({
      kind: 'source',
      id,
    });
  });

  it('gives nothing for a row that is missing or empty', () => {
    expect(removedItem(null)).toBeNull();
    expect(removedItem({ claim_id: null, source_id: null })).toBeNull();
    expect(removedItem({ claim_id: 'nope' })).toBeNull();
  });
});
