import {
  assessmentCriteria,
  claimCategories,
  criterionStatuses,
  evidencePositions,
  reportKinds,
  sourceTypes,
  type ClaimCategory,
  type EvidencePosition,
  type AssessmentCriterion,
  type CriterionStatus,
  type ReportKind,
  type SourceType,
} from '@/lib/domain/enums';

// Turns the raw record of a review item into labelled rows a person can read.
// Labels and terms are message keys, so the page translates them; nothing here
// depends on the language.

export type FieldLabel =
  | 'studio.fields.claimTitle'
  | 'studio.fields.description'
  | 'studio.fields.category'
  | 'studio.fields.origin'
  | 'studio.fields.originUrl'
  | 'studio.fields.firstAppearedOn'
  | 'studio.fields.keywords'
  | 'studio.fields.language'
  | 'studio.fields.sourceTitle'
  | 'studio.fields.publisher'
  | 'studio.fields.url'
  | 'studio.fields.authors'
  | 'studio.fields.publishedOn'
  | 'studio.fields.accessedOn'
  | 'studio.fields.type'
  | 'claims.detail.evidenceTitle'
  | 'claims.detail.limitations'
  | 'claims.detail.researcherNote'
  | 'review.types.claim'
  | 'review.types.source'
  | 'review.fields.summary'
  | 'review.fields.position'
  | 'review.fields.status'
  | 'review.fields.notes'
  | 'review.fields.criterion'
  | 'review.fields.kind'
  | 'review.fields.reason'
  | 'review.fields.reportedItem';

export type TermKey =
  | `claims.category.${ClaimCategory}`
  | `sources.type.${SourceType}`
  | `evidence.positions.${EvidencePosition}`
  | `sources.criterionStatus.${CriterionStatus}`
  | `sources.criteria.${AssessmentCriterion}`
  | `review.reportKinds.${ReportKind}`;

export type FieldValue =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'link'; href: string }
  | { kind: 'date'; iso: string }
  | { kind: 'term'; key: TermKey };

export interface Entry {
  label: FieldLabel;
  value: FieldValue;
}

export interface Change {
  label: FieldLabel;
  before: FieldValue | null;
  after: FieldValue | null;
}

type Format =
  | 'text'
  | 'list'
  | 'link'
  | 'date'
  | 'category'
  | 'sourceType'
  | 'position'
  | 'criterionStatus'
  | 'criterion'
  | 'reportKind';

type Spec = Record<string, readonly [FieldLabel, Format]>;

// The order here is the order on the page.
const specs = {
  claim: {
    title: ['studio.fields.claimTitle', 'text'],
    description: ['studio.fields.description', 'text'],
    category: ['studio.fields.category', 'category'],
    origin: ['studio.fields.origin', 'text'],
    origin_url: ['studio.fields.originUrl', 'link'],
    first_appeared_on: ['studio.fields.firstAppearedOn', 'date'],
    keywords: ['studio.fields.keywords', 'list'],
    language: ['studio.fields.language', 'text'],
  },
  source: {
    title: ['studio.fields.sourceTitle', 'text'],
    publisher: ['studio.fields.publisher', 'text'],
    url: ['studio.fields.url', 'link'],
    authors: ['studio.fields.authors', 'list'],
    published_on: ['studio.fields.publishedOn', 'date'],
    accessed_on: ['studio.fields.accessedOn', 'date'],
    type: ['studio.fields.type', 'sourceType'],
    language: ['studio.fields.language', 'text'],
  },
  evidence: {
    title: ['claims.detail.evidenceTitle', 'text'],
    summary: ['review.fields.summary', 'text'],
    position: ['review.fields.position', 'position'],
    limitations: ['claims.detail.limitations', 'text'],
    researcher_note: ['claims.detail.researcherNote', 'text'],
    source_id: ['review.types.source', 'text'],
  },
  assessment: {
    criterion: ['review.fields.criterion', 'criterion'],
    status: ['review.fields.status', 'criterionStatus'],
    notes: ['review.fields.notes', 'text'],
  },
  report: {
    kind: ['review.fields.kind', 'reportKind'],
    reason: ['review.fields.reason', 'text'],
    suggested_url: ['studio.fields.url', 'link'],
  },
} as const satisfies Record<string, Spec>;

export type SubjectKind = keyof typeof specs;

export function isSubjectKind(value: string): value is SubjectKind {
  return Object.hasOwn(specs, value);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const dateOnly = /^\d{4}-\d{2}-\d{2}/;
const webAddress = /^https?:\/\/\S+$/i;

function member<const T extends readonly string[]>(
  values: T,
  raw: string,
): T[number] | null {
  return values.find((value) => value === raw) ?? null;
}

export function toValue(format: Format, raw: unknown): FieldValue | null {
  if (raw === null || raw === undefined) return null;

  if (format === 'list') {
    if (!Array.isArray(raw)) return null;
    const items = raw.filter(
      (item): item is string => typeof item === 'string' && item !== '',
    );
    return items.length > 0 ? { kind: 'list', items } : null;
  }

  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const text: FieldValue = { kind: 'text', text: raw };

  switch (format) {
    case 'link':
      return webAddress.test(raw) ? { kind: 'link', href: raw } : text;
    case 'date':
      return dateOnly.test(raw) ? { kind: 'date', iso: raw.slice(0, 10) } : text;
    case 'category': {
      const value = member(claimCategories, raw);
      return value ? { kind: 'term', key: `claims.category.${value}` } : text;
    }
    case 'sourceType': {
      const value = member(sourceTypes, raw);
      return value ? { kind: 'term', key: `sources.type.${value}` } : text;
    }
    case 'position': {
      const value = member(evidencePositions, raw);
      return value ? { kind: 'term', key: `evidence.positions.${value}` } : text;
    }
    case 'criterionStatus': {
      const value = member(criterionStatuses, raw);
      return value ? { kind: 'term', key: `sources.criterionStatus.${value}` } : text;
    }
    case 'criterion': {
      const value = member(assessmentCriteria, raw);
      return value ? { kind: 'term', key: `sources.criteria.${value}` } : text;
    }
    case 'reportKind': {
      const value = member(reportKinds, raw);
      return value ? { kind: 'term', key: `review.reportKinds.${value}` } : text;
    }
    case 'text':
      return text;
  }
}

/** The fields of one record, in reading order, leaving out the ones that are empty. */
export function describeRecord(
  kind: SubjectKind,
  record: unknown,
  omit: readonly string[] = [],
): Entry[] {
  if (!isRecord(record)) return [];
  const entries: Entry[] = [];
  for (const [field, [label, format]] of Object.entries<readonly [FieldLabel, Format]>(
    specs[kind],
  )) {
    if (omit.includes(field)) continue;
    const value = toValue(format, record[field]);
    if (value) entries.push({ label, value });
  }
  return entries;
}

const sameValue = (a: FieldValue | null, b: FieldValue | null) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * What a revision would change: only the fields it names, and only where the new
 * value differs from the current one. An empty value (a cleared date, say) is
 * kept as a change, shown as nothing.
 */
export function describeChanges(
  kind: SubjectKind,
  payload: unknown,
  current: unknown,
): Change[] {
  if (!isRecord(payload)) return [];
  const now = isRecord(current) ? current : {};
  const changes: Change[] = [];
  for (const [field, [label, format]] of Object.entries<readonly [FieldLabel, Format]>(
    specs[kind],
  )) {
    if (!(field in payload)) continue;
    const before = toValue(format, now[field]);
    const after = toValue(format, payload[field]);
    if (!sameValue(before, after)) changes.push({ label, before, after });
  }
  return changes;
}
