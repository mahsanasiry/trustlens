import { describe, expect, it } from 'vitest';
import {
  claimDetailDto,
  claimListDto,
  claimPageUrl,
  sourceDetailDto,
  sourceListDto,
} from '@/lib/api/serialize';
import type { ClaimPage, ClaimView } from '@/lib/data/claims';
import type { SourceDetail, SourcePage, SourceSummary } from '@/lib/data/sources';

const origin = new URL('https://trustlens.example');
const claimId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const sourceId = '33333333-3333-4333-8333-333333333333';

describe('claimPageUrl', () => {
  it('uses the claim language when the site is translated into it', () => {
    expect(claimPageUrl(origin, claimId, 'fr')).toBe(
      `https://trustlens.example/fr/claims/${claimId}`,
    );
  });

  it('falls back to English for a language the site does not offer', () => {
    expect(claimPageUrl(origin, claimId, 'xx')).toBe(
      `https://trustlens.example/en/claims/${claimId}`,
    );
  });
});

describe('claimListDto', () => {
  const page: ClaimPage = {
    items: [
      {
        id: claimId,
        title: 'A claim',
        category: 'science',
        status: 'evidence_available',
        language: 'en',
        released_at: '2026-01-02T03:04:05Z',
        evidence: [
          { position: 'supports' },
          { position: 'supports' },
          { position: 'context' },
        ],
      },
    ],
    total: 25,
    page: 2,
    pageCount: 3,
  };

  it('renames fields to camelCase and counts evidence by position', () => {
    const dto = claimListDto(origin, page);
    expect(dto.data[0]).toEqual({
      id: claimId,
      title: 'A claim',
      category: 'science',
      status: 'evidence_available',
      language: 'en',
      releasedAt: '2026-01-02T03:04:05Z',
      evidenceCounts: { supports: 2, contradicts: 0, context: 1 },
      pageUrl: `https://trustlens.example/en/claims/${claimId}`,
    });
  });

  it('describes the page', () => {
    expect(claimListDto(origin, page).meta).toEqual({
      page: 2,
      pageSize: 12,
      total: 25,
      pageCount: 3,
    });
  });
});

describe('claimDetailDto', () => {
  const view: ClaimView = {
    claim: {
      id: claimId,
      title: 'A claim',
      description: 'Details',
      category: 'technology',
      status: 'conflicting_evidence',
      origin: 'A post',
      origin_url: 'javascript:alert(1)',
      first_appeared_on: null,
      language: 'en',
      version: 4,
      updated_at: '2026-02-03T00:00:00Z',
      evidence: [
        {
          id: otherId,
          title: 'A study',
          summary: 'Found something',
          position: 'contradicts',
          limitations: 'Small sample',
          researcher_note: 'Note',
          sort_order: 1,
          sources: {
            id: sourceId,
            title: 'The paper',
            publisher: 'A journal',
            url: 'https://example.org/paper',
            published_on: '2025-05-05',
            type: 'journal_article',
            language: 'en',
          },
        },
        {
          id: sourceId,
          title: 'Orphaned',
          summary: '',
          position: 'context',
          limitations: '',
          researcher_note: '',
          sort_order: 2,
          sources: null,
        },
      ],
    },
    statusChanges: [
      {
        id: otherId,
        from_status: 'under_review',
        to_status: 'conflicting_evidence',
        reason: 'New study',
        created_at: '2026-02-01T00:00:00Z',
      },
    ],
    related: [
      {
        id: otherId,
        title: 'Related',
        category: 'science',
        status: 'unreviewed',
        language: 'de',
      },
    ],
  };

  const dto = claimDetailDto(origin, view);

  it('drops an origin link that is not http(s)', () => {
    expect(dto.originUrl).toBeNull();
  });

  it('nests the source under its evidence and keeps null for a missing one', () => {
    expect(dto.evidence[0]?.source?.url).toBe('https://example.org/paper');
    expect(dto.evidence[0]?.source?.publishedOn).toBe('2025-05-05');
    expect(dto.evidence[1]?.source).toBeNull();
  });

  it('exposes the status history with plain names', () => {
    expect(dto.statusHistory).toEqual([
      {
        id: otherId,
        from: 'under_review',
        to: 'conflicting_evidence',
        reason: 'New study',
        changedAt: '2026-02-01T00:00:00Z',
      },
    ]);
  });

  it('links related claims in their own language', () => {
    expect(dto.related[0]?.pageUrl).toBe(
      `https://trustlens.example/de/claims/${otherId}`,
    );
  });

  it('counts evidence by position', () => {
    expect(dto.evidenceCounts).toEqual({ supports: 0, contradicts: 1, context: 1 });
  });

  it('does not expose internal ordering or database column names', () => {
    const text = JSON.stringify(dto);
    expect(text).not.toContain('sort_order');
    expect(text).not.toContain('researcher_note');
  });
});

describe('source DTOs', () => {
  const assessments = [
    { criterion: 'author_transparency', status: 'verified', notes: 'Named' },
  ] as const;

  const summary: SourceSummary = {
    id: sourceId,
    title: 'The paper',
    publisher: 'A journal',
    type: 'journal_article',
    language: 'es',
    published_on: null,
    source_assessments: [...assessments],
  };

  const page: SourcePage = {
    items: [summary],
    total: 1,
    page: 1,
    pageCount: 1,
  };

  it('lists sources with their assessments', () => {
    const dto = sourceListDto(origin, page);
    expect(dto.data[0]).toEqual({
      id: sourceId,
      title: 'The paper',
      publisher: 'A journal',
      type: 'journal_article',
      language: 'es',
      publishedOn: null,
      assessments: [...assessments],
      pageUrl: `https://trustlens.example/es/sources/${sourceId}`,
    });
    expect(dto.meta.pageSize).toBe(12);
  });

  it('adds the external link, authors and citing claims to the detail', () => {
    const detail: SourceDetail = {
      ...summary,
      url: 'https://example.org/paper',
      authors: ['A. Author'],
      accessed_on: '2026-01-01',
      citedBy: [
        {
          evidenceId: otherId,
          position: 'supports',
          claim: {
            id: claimId,
            title: 'A claim',
            category: 'science',
            status: 'under_review',
            language: 'en',
          },
        },
      ],
    };
    const dto = sourceDetailDto(origin, detail);
    expect(dto.url).toBe('https://example.org/paper');
    expect(dto.authors).toEqual(['A. Author']);
    expect(dto.accessedOn).toBe('2026-01-01');
    expect(dto.citedBy[0]?.claim.pageUrl).toBe(
      `https://trustlens.example/en/claims/${claimId}`,
    );
  });
});
