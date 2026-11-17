import { describe, expect, it } from 'vitest';
import { parseClaimQuery, parseSourceQuery } from '@/lib/api/query';

const query = (value: string) => new URLSearchParams(value);

describe('parseClaimQuery', () => {
  it('defaults to the first page with no filters', () => {
    expect(parseClaimQuery(query(''))).toEqual({
      ok: true,
      value: { category: undefined, status: undefined, page: 1 },
    });
  });

  it('accepts known filters and a page number', () => {
    expect(parseClaimQuery(query('category=science&status=under_review&page=3'))).toEqual(
      {
        ok: true,
        value: { category: 'science', status: 'under_review', page: 3 },
      },
    );
  });

  it('treats empty values as absent', () => {
    expect(parseClaimQuery(query('category=&status=&page='))).toEqual({
      ok: true,
      value: { category: undefined, status: undefined, page: 1 },
    });
  });

  it('rejects an unknown category and lists the allowed values', () => {
    const result = parseClaimQuery(query('category=sports'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('"category" must be one of');
      expect(result.message).toContain('science');
    }
  });

  it('rejects a status that is a verdict rather than an evidence state', () => {
    expect(parseClaimQuery(query('status=true')).ok).toBe(false);
  });

  it.each(['0', '-1', '1.5', 'abc', '10001', '999999'])('rejects page=%s', (page) => {
    expect(parseClaimQuery(query(`page=${page}`)).ok).toBe(false);
  });

  it('accepts the largest page', () => {
    const result = parseClaimQuery(query('page=10000'));
    expect(result.ok && result.value.page).toBe(10_000);
  });

  it('reports every problem at once', () => {
    const result = parseClaimQuery(query('category=x&status=y&page=0'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('"category"');
      expect(result.message).toContain('"status"');
      expect(result.message).toContain('"page"');
    }
  });

  it('ignores parameters it does not know', () => {
    expect(parseClaimQuery(query('q=anything')).ok).toBe(true);
  });
});

describe('parseSourceQuery', () => {
  it('accepts a source type and a page', () => {
    expect(parseSourceQuery(query('type=dataset&page=2'))).toEqual({
      ok: true,
      value: { type: 'dataset', page: 2 },
    });
  });

  it('rejects an unknown type', () => {
    expect(parseSourceQuery(query('type=blog')).ok).toBe(false);
  });
});
