import { describe, expect, it } from 'vitest';
import { decisionsFor, parseDecision, parseQueueFilters } from './review-params';

describe('parseQueueFilters', () => {
  it('reads a type and a page', () => {
    expect(parseQueueFilters({ type: 'claim', page: '3' })).toEqual({
      type: 'claim',
      page: 3,
    });
  });

  it('drops values it does not recognise', () => {
    expect(parseQueueFilters({ type: 'nonsense', page: '-4' })).toEqual({
      type: undefined,
      page: 1,
    });
  });

  it('starts on the first page without a type', () => {
    expect(parseQueueFilters({})).toEqual({ type: undefined, page: 1 });
  });
});

describe('parseDecision', () => {
  it('approves without a reason', () => {
    expect(parseDecision('approved', '')).toEqual({
      ok: true,
      decision: 'approved',
      reason: null,
    });
  });

  it('keeps an optional reason when approving', () => {
    expect(parseDecision('approved', '  Well sourced  ')).toEqual({
      ok: true,
      decision: 'approved',
      reason: 'Well sourced',
    });
  });

  it('requires a reason for anything but approval', () => {
    expect(parseDecision('rejected', '  ')).toEqual({ ok: false, error: 'reason' });
    expect(parseDecision('changes_requested', 'ab')).toEqual({
      ok: false,
      error: 'reason',
    });
  });

  it('counts characters, not UTF-16 units', () => {
    expect(parseDecision('rejected', '😀😀😀').ok).toBe(true);
  });

  it('rejects an unknown decision or an over-long reason', () => {
    expect(parseDecision('maybe', 'because')).toEqual({ ok: false, error: 'invalid' });
    expect(parseDecision(null, 'because')).toEqual({ ok: false, error: 'invalid' });
    expect(parseDecision('rejected', 'x'.repeat(1001))).toEqual({
      ok: false,
      error: 'invalid',
    });
  });
});

describe('decisionsFor', () => {
  it('offers a report only accept and dismiss', () => {
    expect(decisionsFor('report')).toEqual(['approved', 'rejected']);
  });

  it('offers other items every decision', () => {
    expect(decisionsFor('claim')).toEqual(['approved', 'changes_requested', 'rejected']);
  });
});
