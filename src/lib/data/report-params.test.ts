import { describe, expect, it } from 'vitest';
import { parseReport } from './report-params';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

const valid = {
  kind: 'broken_source',
  target_type: 'claim',
  target_id: '11111111-2222-3333-4444-555555555555',
  reason: 'The first link no longer opens',
  suggested_url: '',
};

describe('parseReport', () => {
  it('accepts a report without a link', () => {
    expect(parseReport(form(valid))).toEqual({ ...valid, suggested_url: null });
  });

  it('keeps a web address and trims the reason', () => {
    const result = parseReport(
      form({
        ...valid,
        reason: '  Moved  here ',
        suggested_url: 'https://example.test/new',
      }),
    );
    expect(result?.suggested_url).toBe('https://example.test/new');
    expect(result?.reason).toBe('Moved  here');
  });

  it.each([
    ['an unknown kind', { kind: 'spam' }],
    ['a target that cannot be reported', { target_type: 'assessment' }],
    ['a target that is not an id', { target_id: 'nope' }],
    ['a reason that is too short', { reason: 'no' }],
    ['a reason that is too long', { reason: 'x'.repeat(2001) }],
    ['a link that is not a web address', { suggested_url: 'javascript:alert(1)' }],
    ['a link with spaces', { suggested_url: 'https://a.test/a b' }],
  ])('rejects %s', (_label, change) => {
    expect(parseReport(form({ ...valid, ...change }))).toBeNull();
  });
});
