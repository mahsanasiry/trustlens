import { describe, expect, it } from 'vitest';
import {
  isCriterion,
  parseAssessmentInput,
  parseEvidenceInput,
  readField,
} from './authoring-params';

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

const sourceId = '11111111-2222-3333-4444-555555555555';

const evidence = {
  source_id: sourceId,
  title: 'Tide gauge records',
  summary: 'Gauges show a steady rise.',
  position: 'supports',
  limitations: '',
  researcher_note: '',
};

describe('parseEvidenceInput', () => {
  it('accepts a complete form', () => {
    expect(parseEvidenceInput(form(evidence))).toEqual({ ok: true, value: evidence });
  });

  it('trims text and keeps optional fields empty', () => {
    const result = parseEvidenceInput(
      form({ ...evidence, title: '  Tide gauge records  ' }),
    );
    expect(result.ok && result.value.title).toBe('Tide gauge records');
  });

  it.each([
    ['a missing source', { source_id: '' }],
    ['a source that is not an id', { source_id: 'abc' }],
    ['a short title', { title: 'ab' }],
    ['an empty summary', { summary: '   ' }],
    ['an unknown position', { position: 'maybe' }],
    ['over-long limitations', { limitations: 'x'.repeat(3001) }],
  ])('rejects %s', (_label, change) => {
    expect(parseEvidenceInput(form({ ...evidence, ...change }))).toEqual({
      ok: false,
      error: 'invalid',
    });
  });
});

describe('parseAssessmentInput', () => {
  it('accepts a check with or without notes', () => {
    const base = { criterion: 'author_transparency', status: 'verified', notes: '' };
    expect(parseAssessmentInput(form(base)).ok).toBe(true);
    expect(
      parseAssessmentInput(form({ ...base, notes: 'Named on the title page' })).ok,
    ).toBe(true);
  });

  it('rejects an unknown criterion or status', () => {
    expect(
      parseAssessmentInput(form({ criterion: 'colour', status: 'verified', notes: '' }))
        .ok,
    ).toBe(false);
    expect(
      parseAssessmentInput(
        form({ criterion: 'author_transparency', status: 'great', notes: '' }),
      ).ok,
    ).toBe(false);
  });
});

describe('readField and isCriterion', () => {
  it('reads an id only when it has the shape of one', () => {
    expect(readField(form({ claim_id: sourceId }), 'claim_id')).toBe(sourceId);
    expect(readField(form({ claim_id: 'nope' }), 'claim_id')).toBeNull();
    expect(readField(form({}), 'claim_id')).toBeNull();
  });

  it('knows the criteria', () => {
    expect(isCriterion('citations_present')).toBe(true);
    expect(isCriterion('toString')).toBe(false);
  });
});
