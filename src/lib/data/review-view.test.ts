import { describe, expect, it } from 'vitest';
import { describeChanges, describeRecord, isSubjectKind, toValue } from './review-view';

describe('toValue', () => {
  it('leaves out empty values', () => {
    expect(toValue('text', '')).toBeNull();
    expect(toValue('text', '   ')).toBeNull();
    expect(toValue('text', null)).toBeNull();
    expect(toValue('list', [])).toBeNull();
  });

  it('turns known enum values into message keys', () => {
    expect(toValue('category', 'science')).toEqual({
      kind: 'term',
      key: 'claims.category.science',
    });
    expect(toValue('position', 'supports')).toEqual({
      kind: 'term',
      key: 'evidence.positions.supports',
    });
  });

  it('falls back to plain text for a value it does not know', () => {
    expect(toValue('category', 'astrology')).toEqual({ kind: 'text', text: 'astrology' });
  });

  it('links only web addresses', () => {
    expect(toValue('link', 'https://example.test/a')).toEqual({
      kind: 'link',
      href: 'https://example.test/a',
    });
    expect(toValue('link', 'javascript:alert(1)')).toEqual({
      kind: 'text',
      text: 'javascript:alert(1)',
    });
  });

  it('keeps only the date part of a timestamp', () => {
    expect(toValue('date', '2026-03-04T10:00:00Z')).toEqual({
      kind: 'date',
      iso: '2026-03-04',
    });
  });

  it('keeps list entries that are text', () => {
    expect(toValue('list', ['a', '', 3, 'b'])).toEqual({
      kind: 'list',
      items: ['a', 'b'],
    });
  });
});

describe('describeRecord', () => {
  it('lists the fields in reading order and skips empty ones', () => {
    const entries = describeRecord('claim', {
      language: 'en',
      title: 'A claim',
      origin: '',
      category: 'science',
      id: 'ignored',
    });
    expect(entries.map((entry) => entry.label)).toEqual([
      'studio.fields.claimTitle',
      'studio.fields.category',
      'studio.fields.language',
    ]);
  });

  it('returns nothing for something that is not a record', () => {
    expect(describeRecord('claim', null)).toEqual([]);
    expect(describeRecord('claim', 'text')).toEqual([]);
  });
});

describe('describeChanges', () => {
  it('shows only the fields that differ', () => {
    const changes = describeChanges(
      'claim',
      { title: 'New title', category: 'science' },
      { title: 'Old title', category: 'science', description: 'unchanged' },
    );
    expect(changes).toEqual([
      {
        label: 'studio.fields.claimTitle',
        before: { kind: 'text', text: 'Old title' },
        after: { kind: 'text', text: 'New title' },
      },
    ]);
  });

  it('keeps a cleared field as a change to nothing', () => {
    const changes = describeChanges(
      'claim',
      { origin_url: null },
      { origin_url: 'https://a.test' },
    );
    expect(changes).toEqual([
      {
        label: 'studio.fields.originUrl',
        before: { kind: 'link', href: 'https://a.test' },
        after: null,
      },
    ]);
  });

  it('still lists the changes when the current item is gone', () => {
    expect(describeChanges('source', { publisher: 'Press' }, null)).toHaveLength(1);
  });
});

describe('isSubjectKind', () => {
  it('accepts the kinds that have a record to show', () => {
    expect(isSubjectKind('evidence')).toBe(true);
    expect(isSubjectKind('revision')).toBe(false);
    expect(isSubjectKind('toString')).toBe(false);
  });
});

describe('describeRecord omit', () => {
  it('leaves out fields the page shows another way', () => {
    const entries = describeRecord('evidence', { title: 'Finding', source_id: 'abc' }, [
      'source_id',
    ]);
    expect(entries.map((entry) => entry.label)).toEqual(['claims.detail.evidenceTitle']);
  });
});
