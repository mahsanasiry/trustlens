import { describe, expect, it } from 'vitest';
import {
  parseAuthors,
  parseClaimInput,
  parseKeywords,
  parseSourceInput,
  readEntityId,
  readLocale,
} from './studio-params';

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

const claim = {
  title: 'Bus lanes cut commute times',
  description: '',
  category: 'public_policy',
  origin: '',
  origin_url: '',
  first_appeared_on: '',
  keywords: 'transport, buses',
  language: 'en',
};

const source = {
  title: 'Journey-time study',
  publisher: 'Transit Authority',
  url: 'https://example.org/study',
  authors: 'A. Writer\nB. Author',
  published_on: '2025-03-01',
  accessed_on: '2025-04-01',
  type: 'report',
  language: 'en',
};

describe('parseKeywords', () => {
  it('splits on commas, semicolons, Arabic and CJK commas and new lines', () => {
    expect(parseKeywords('a, b;c،d，e\nf')).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('drops blanks, repeats and over-long entries, and keeps at most 20', () => {
    expect(parseKeywords(' , a, A ,,b')).toEqual(['a', 'b']);
    expect(parseKeywords('x'.repeat(61))).toEqual([]);
    const many = Array.from({ length: 30 }, (_, index) => `k${index}`).join(',');
    expect(parseKeywords(many)).toHaveLength(20);
  });
});

describe('parseAuthors', () => {
  it('reads one author per line and keeps commas inside a name', () => {
    expect(parseAuthors('Smith, Jane\n\nLee, Ann\nSmith, Jane')).toEqual([
      'Smith, Jane',
      'Lee, Ann',
    ]);
  });
});

describe('parseClaimInput', () => {
  it('accepts a complete claim and normalises the optional fields', () => {
    const result = parseClaimInput(form(claim));
    expect(result).toEqual({
      ok: true,
      value: {
        title: 'Bus lanes cut commute times',
        description: '',
        category: 'public_policy',
        origin: '',
        origin_url: null,
        first_appeared_on: null,
        keywords: ['transport', 'buses'],
        language: 'en',
      },
    });
  });

  it('rejects a short title, an unknown category and a bad address', () => {
    expect(parseClaimInput(form({ ...claim, title: 'ab' })).ok).toBe(false);
    expect(parseClaimInput(form({ ...claim, category: 'sports' })).ok).toBe(false);
    expect(
      parseClaimInput(form({ ...claim, origin_url: 'javascript:alert(1)' })).ok,
    ).toBe(false);
    expect(parseClaimInput(form({ ...claim, origin_url: 'ftp://example.org' })).ok).toBe(
      false,
    );
  });

  it('counts characters the way the database does', () => {
    expect(parseClaimInput(form({ ...claim, title: '😀😀' })).ok).toBe(false);
    expect(parseClaimInput(form({ ...claim, title: '😀😀😀' })).ok).toBe(true);
  });

  it('rejects dates that do not exist', () => {
    expect(parseClaimInput(form({ ...claim, first_appeared_on: '2025-02-30' })).ok).toBe(
      false,
    );
    expect(parseClaimInput(form({ ...claim, first_appeared_on: '2024-02-29' })).ok).toBe(
      true,
    );
  });

  it('rejects an unsupported language', () => {
    expect(parseClaimInput(form({ ...claim, language: 'xx' })).ok).toBe(false);
  });
});

describe('parseSourceInput', () => {
  it('accepts a complete source', () => {
    const result = parseSourceInput(form(source));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.authors).toEqual(['A. Writer', 'B. Author']);
  });

  it('requires an http or https address', () => {
    expect(parseSourceInput(form({ ...source, url: '' })).ok).toBe(false);
    expect(parseSourceInput(form({ ...source, url: 'example.org' })).ok).toBe(false);
  });

  it('reports an access date before the publication date as its own error', () => {
    expect(parseSourceInput(form({ ...source, accessed_on: '2025-02-01' }))).toEqual({
      ok: false,
      error: 'dates',
    });
    expect(
      parseSourceInput(form({ ...source, published_on: '', accessed_on: '2025-02-01' }))
        .ok,
    ).toBe(true);
  });

  it('rejects an unknown type', () => {
    expect(parseSourceInput(form({ ...source, type: 'blog' })).ok).toBe(false);
  });
});

describe('readLocale and readEntityId', () => {
  it('accept known locales and id-shaped values only', () => {
    expect(readLocale(form({ locale: 'fa' }))).toBe('fa');
    expect(readLocale(form({ locale: 'xx' }))).toBeNull();
    expect(
      readEntityId(form({ id: '00000000-0000-0000-0000-000000000001' })),
    ).not.toBeNull();
    expect(readEntityId(form({ id: 'nope' }))).toBeNull();
  });
});
