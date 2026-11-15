import { describe, expect, it } from 'vitest';
import { emptyResultPage, toResultPage } from '@/lib/data/result-item';

const claimRow = {
  kind: 'claim',
  id: 'c1',
  title: 'A claim',
  language: 'en',
  category: 'science',
  status: 'unreviewed',
  total_count: 25,
};
const sourceRow = {
  kind: 'source',
  id: 's1',
  title: 'A source',
  language: 'fa',
  source_type: 'report',
  publisher: 'Someone',
  total_count: 25,
};

describe('toResultPage', () => {
  it('reads the total from the rows and computes the page count', () => {
    const page = toResultPage([claimRow, sourceRow], 2, 12);
    expect(page).toMatchObject({ total: 25, page: 2, pageCount: 3 });
    expect(page.items).toHaveLength(2);
  });

  it('does not pass the total on inside each item', () => {
    const [item] = toResultPage([claimRow], 1, 12).items;
    expect(item).not.toHaveProperty('total_count');
  });

  it('treats no rows as an empty page', () => {
    expect(toResultPage([], 3, 12)).toEqual({
      items: [],
      total: 0,
      page: 3,
      pageCount: 0,
    });
  });

  it('rejects rows that do not match the expected shape', () => {
    expect(() => toResultPage([{ ...claimRow, category: 'sport' }], 1, 12)).toThrow();
  });
});

describe('emptyResultPage', () => {
  it('keeps the requested page number', () => {
    expect(emptyResultPage(4).page).toBe(4);
  });
});
