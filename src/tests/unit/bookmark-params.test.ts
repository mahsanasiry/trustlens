import { describe, expect, it } from 'vitest';
import { parseBookmarkForm, parseBookmarkPage } from '@/lib/data/bookmark-params';

const id = '6f17a0fd-3a9c-c965-9fbf-14149cb85cf5';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = { kind: 'claim', id, intent: 'save', locale: 'fa', next: '/claims/abc' };

describe('parseBookmarkForm', () => {
  it('accepts a complete form', () => {
    expect(parseBookmarkForm(form(valid))).toEqual(valid);
  });

  it('accepts both kinds and both intents', () => {
    expect(
      parseBookmarkForm(form({ ...valid, kind: 'source', intent: 'remove' })),
    ).toMatchObject({
      kind: 'source',
      intent: 'remove',
    });
  });

  it.each([
    ['an unknown kind', { kind: 'person' }],
    ['an id that is not an id', { id: 'not-an-id' }],
    ['an unknown intent', { intent: 'toggle' }],
    ['an unknown locale', { locale: 'xx' }],
  ])('rejects %s', (_name, override) => {
    expect(parseBookmarkForm(form({ ...valid, ...override }))).toBeNull();
  });

  it('rejects a form with a missing field', () => {
    const { id: _omitted, ...rest } = valid;
    expect(parseBookmarkForm(form(rest))).toBeNull();
  });

  it('falls back to the home page for a return path that leaves the site', () => {
    for (const next of ['https://evil.example', '//evil.example', '\\evil', 'claims']) {
      expect(parseBookmarkForm(form({ ...valid, next }))?.next).toBe('/');
    }
  });

  it('keeps a query string on the return path', () => {
    expect(parseBookmarkForm(form({ ...valid, next: '/bookmarks?page=2' }))?.next).toBe(
      '/bookmarks?page=2',
    );
  });
});

describe('parseBookmarkPage', () => {
  it('reads the page number', () => {
    expect(parseBookmarkPage({ page: '4' })).toBe(4);
  });

  it('falls back to the first page', () => {
    expect(parseBookmarkPage({})).toBe(1);
    expect(parseBookmarkPage({ page: '0' })).toBe(1);
    expect(parseBookmarkPage({ page: 'x' })).toBe(1);
  });
});
