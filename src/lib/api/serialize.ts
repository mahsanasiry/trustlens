import type { ClaimPage, ClaimSummary, ClaimView, EvidenceItem } from '@/lib/data/claims';
import type { SourceDetail, SourcePage, SourceSummary } from '@/lib/data/sources';
import { countPositions } from '@/lib/data/position-counts';
import { claimsPageSize } from '@/lib/data/claim-params';
import { sourcesPageSize } from '@/lib/data/source-params';
import type { Assessment } from '@/lib/data/assessments';
import { defaultLocale, isLocaleCode } from '@/lib/i18n/locales';
import { safeHttpUrl } from '@/lib/safe-url';

// Pages exist under the content's own language when the site translates the
// interface into it, and under the default language otherwise.
function pagePath(kind: 'claims' | 'sources', id: string, language: string): string {
  const locale = isLocaleCode(language) ? language : defaultLocale;
  return `/${locale}/${kind}/${id}`;
}

export function claimPageUrl(origin: URL, id: string, language: string): string {
  return new URL(pagePath('claims', id, language), origin).href;
}

export function sourcePageUrl(origin: URL, id: string, language: string): string {
  return new URL(pagePath('sources', id, language), origin).href;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}

function meta(
  page: { page: number; total: number; pageCount: number },
  pageSize: number,
): PageMeta {
  return {
    page: page.page,
    pageSize,
    total: page.total,
    pageCount: page.pageCount,
  };
}

export function claimSummaryDto(origin: URL, claim: ClaimSummary) {
  return {
    id: claim.id,
    title: claim.title,
    category: claim.category,
    status: claim.status,
    language: claim.language,
    releasedAt: claim.released_at,
    evidenceCounts: countPositions(claim.evidence),
    pageUrl: claimPageUrl(origin, claim.id, claim.language),
  };
}

export function claimListDto(origin: URL, page: ClaimPage) {
  return {
    data: page.items.map((claim) => claimSummaryDto(origin, claim)),
    meta: meta(page, claimsPageSize),
  };
}

function evidenceDto(item: EvidenceItem) {
  const source = item.sources;
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    position: item.position,
    limitations: item.limitations,
    researcherNote: item.researcher_note,
    source: source
      ? {
          id: source.id,
          title: source.title,
          publisher: source.publisher,
          url: safeHttpUrl(source.url),
          publishedOn: source.published_on,
          type: source.type,
          language: source.language,
        }
      : null,
  };
}

export function claimDetailDto(origin: URL, view: ClaimView) {
  const { claim } = view;
  return {
    id: claim.id,
    title: claim.title,
    description: claim.description,
    category: claim.category,
    status: claim.status,
    origin: claim.origin,
    originUrl: safeHttpUrl(claim.origin_url),
    firstAppearedOn: claim.first_appeared_on,
    language: claim.language,
    version: claim.version,
    updatedAt: claim.updated_at,
    evidenceCounts: countPositions(claim.evidence),
    evidence: claim.evidence.map(evidenceDto),
    statusHistory: view.statusChanges.map((change) => ({
      id: change.id,
      from: change.from_status,
      to: change.to_status,
      reason: change.reason,
      changedAt: change.created_at,
    })),
    related: view.related.map((item) => ({
      id: item.id,
      title: item.title,
      category: item.category,
      status: item.status,
      language: item.language,
      pageUrl: claimPageUrl(origin, item.id, item.language),
    })),
    pageUrl: claimPageUrl(origin, claim.id, claim.language),
  };
}

function assessmentDto(assessment: Assessment) {
  return {
    criterion: assessment.criterion,
    status: assessment.status,
    notes: assessment.notes,
  };
}

export function sourceSummaryDto(origin: URL, source: SourceSummary) {
  return {
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    type: source.type,
    language: source.language,
    publishedOn: source.published_on,
    assessments: source.source_assessments.map(assessmentDto),
    pageUrl: sourcePageUrl(origin, source.id, source.language),
  };
}

export function sourceListDto(origin: URL, page: SourcePage) {
  return {
    data: page.items.map((source) => sourceSummaryDto(origin, source)),
    meta: meta(page, sourcesPageSize),
  };
}

export function sourceDetailDto(origin: URL, source: SourceDetail) {
  return {
    ...sourceSummaryDto(origin, source),
    url: safeHttpUrl(source.url),
    authors: source.authors,
    accessedOn: source.accessed_on,
    citedBy: source.citedBy.map((citation) => ({
      evidenceId: citation.evidenceId,
      position: citation.position,
      claim: {
        id: citation.claim.id,
        title: citation.claim.title,
        category: citation.claim.category,
        status: citation.claim.status,
        language: citation.claim.language,
        pageUrl: claimPageUrl(origin, citation.claim.id, citation.claim.language),
      },
    })),
  };
}
