import { describe, expect, it } from 'vitest';
import {
  parseAddForm,
  parseCollectionPage,
  parseCreateForm,
  parseDeleteForm,
  parseItemForm,
  parseUpdateForm,
} from '@/lib/data/collection-params';

const id = '6f17a0fd-3a9c-c965-9fbf-14149cb85cf5';

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe('parseCreateForm and parseUpdateForm', () => {
  const create = {
    locale: 'en',
    title: ' Housing ',
    description: ' notes ',
    visibility: 'private',
  };

  it('trims the title and description', () => {
    expect(parseCreateForm(form(create))).toEqual({
      locale: 'en',
      title: 'Housing',
      description: 'notes',
      visibility: 'private',
    });
  });

  it('treats a missing description as empty', () => {
    const { description: _omitted, ...rest } = create;
    expect(parseCreateForm(form(rest))?.description).toBe('');
  });

  it.each([
    ['a blank title', { title: '   ' }],
    ['a title over 120 characters', { title: 'x'.repeat(121) }],
    ['a description over 2000 characters', { description: 'x'.repeat(2001) }],
    ['the public visibility, which has no page yet', { visibility: 'public' }],
    ['an unknown visibility', { visibility: 'secret' }],
    ['an unknown locale', { locale: 'xx' }],
  ])('rejects %s', (_name, override) => {
    expect(parseCreateForm(form({ ...create, ...override }))).toBeNull();
  });

  it('needs a valid id to update', () => {
    expect(parseUpdateForm(form({ ...create, id }))).not.toBeNull();
    expect(parseUpdateForm(form({ ...create, id: 'nope' }))).toBeNull();
    expect(parseUpdateForm(form(create))).toBeNull();
  });
});

describe('parseDeleteForm', () => {
  it('needs the confirmation', () => {
    expect(parseDeleteForm(form({ locale: 'en', id, confirm: 'yes' }))).not.toBeNull();
    expect(parseDeleteForm(form({ locale: 'en', id }))).toBeNull();
    expect(parseDeleteForm(form({ locale: 'en', id, confirm: 'no' }))).toBeNull();
  });
});

describe('parseAddForm', () => {
  const add = {
    locale: 'fa',
    collection_id: id,
    kind: 'source',
    id,
    next: '/sources/abc',
  };

  it('accepts a complete form', () => {
    expect(parseAddForm(form(add))).toEqual(add);
  });

  it('rejects an unknown kind and a bad id', () => {
    expect(parseAddForm(form({ ...add, kind: 'person' }))).toBeNull();
    expect(parseAddForm(form({ ...add, id: 'nope' }))).toBeNull();
  });

  it('sends a return path that leaves the site to the home page', () => {
    expect(parseAddForm(form({ ...add, next: 'https://evil.example' }))?.next).toBe('/');
    expect(parseAddForm(form({ ...add, next: '//evil.example' }))?.next).toBe('/');
  });
});

describe('parseItemForm', () => {
  const item = { locale: 'en', collection_id: id, item_id: id, intent: 'up', page: '2' };

  it('accepts each intent', () => {
    for (const intent of ['remove', 'up', 'down']) {
      expect(parseItemForm(form({ ...item, intent }))?.intent).toBe(intent);
    }
  });

  it('rejects an unknown intent and a bad item id', () => {
    expect(parseItemForm(form({ ...item, intent: 'sideways' }))).toBeNull();
    expect(parseItemForm(form({ ...item, item_id: 'nope' }))).toBeNull();
  });

  it('makes the page optional', () => {
    const { page: _omitted, ...rest } = item;
    expect(parseItemForm(form(rest))).not.toBeNull();
  });
});

describe('parseCollectionPage', () => {
  it('reads the page and falls back to the first', () => {
    expect(parseCollectionPage({ page: '3' })).toBe(3);
    expect(parseCollectionPage({ page: '-1' })).toBe(1);
    expect(parseCollectionPage({})).toBe(1);
  });
});
