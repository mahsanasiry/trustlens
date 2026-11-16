import { z } from 'zod';
import { reviewDecisions, reviewTargets, type ReviewTarget } from '@/lib/domain/enums';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isEntityId } from './params';
import { queuePageSize, type QueueFilters } from './review-params';
import {
  describeChanges,
  describeRecord,
  isSubjectKind,
  type Change,
  type Entry,
} from './review-view';

const queueRowSchema = z.object({
  item_id: z.string(),
  target_type: z.enum(reviewTargets),
  title: z.string().nullable(),
  submitter_name: z.string().nullable(),
  submitted_at: z.string(),
  claimed_by: z.string().nullable(),
  claimed_by_name: z.string().nullable(),
  total_count: z.number(),
});

export interface QueueItem {
  id: string;
  targetType: ReviewTarget;
  title: string | null;
  submitterName: string | null;
  submittedAt: string;
  claimedBy: string | null;
  claimedByName: string | null;
}

export interface QueuePage {
  items: QueueItem[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listReviewQueue(filters: QueueFilters): Promise<QueuePage> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('list_review_queue', {
    p_target: filters.type ?? null,
    p_limit: queuePageSize,
    p_offset: (filters.page - 1) * queuePageSize,
  });
  if (error) throw new Error(`Could not load the review queue: ${error.message}`);

  const rows = z.array(queueRowSchema).parse(data);
  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows.map((row) => ({
      id: row.item_id,
      targetType: row.target_type,
      title: row.title,
      submitterName: row.submitter_name,
      submittedAt: row.submitted_at,
      claimedBy: row.claimed_by,
      claimedByName: row.claimed_by_name,
    })),
    total,
    page: filters.page,
    pageCount: Math.ceil(total / queuePageSize),
  };
}

const jsonObject = z.record(z.string(), z.unknown());

const detailSchema = z
  .object({
    item: z.object({
      id: z.string(),
      target_type: z.enum(reviewTargets),
      submitted_by: z.string().nullable(),
      submitter_name: z.string().nullable(),
      submitted_at: z.string(),
      claimed_by: z.string().nullable(),
      claimed_by_name: z.string().nullable(),
      decided_at: z.string().nullable(),
    }),
    subject: jsonObject.nullable(),
    current: jsonObject.nullable(),
    decision: z
      .object({
        decision: z.enum(reviewDecisions),
        reason: z.string().nullable(),
        reviewer_name: z.string().nullable(),
        decided_at: z.string(),
      })
      .nullable(),
  })
  .nullable();

export interface ReviewDetail {
  id: string;
  targetType: ReviewTarget;
  title: string | null;
  submittedBy: string | null;
  submitterName: string | null;
  submittedAt: string;
  claimedBy: string | null;
  claimedByName: string | null;
  decidedAt: string | null;
  /** Context first (the claim or source an item belongs to), then the fields. */
  entries: Entry[];
  /** For a revision: what it would change. */
  changes: Change[];
  decision: {
    decision: (typeof reviewDecisions)[number];
    reason: string | null;
    reviewerName: string | null;
    decidedAt: string;
  } | null;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

export async function getReviewItem(id: string): Promise<ReviewDetail | null> {
  if (!isEntityId(id)) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('get_review_item', { p_item_id: id });
  if (error) throw new Error(`Could not load the review item: ${error.message}`);

  const detail = detailSchema.parse(data);
  if (!detail) return null;

  const { item } = detail;
  const subject = detail.subject ?? {};
  const kind = item.target_type;

  let title: string | null = null;
  const entries: Entry[] = [];
  let changes: Change[] = [];

  if (kind === 'revision') {
    title = text(subject['change_summary']);
    const entity = text(subject['entity_type']);
    if (entity && isSubjectKind(entity)) {
      changes = describeChanges(entity, subject['payload'], detail.current);
    }
  } else if (isSubjectKind(kind)) {
    const context = (label: Entry['label'], value: unknown) => {
      const found = text(value);
      if (found) entries.push({ label, value: { kind: 'text', text: found } });
    };
    if (kind === 'evidence') {
      context('review.types.claim', subject['claim_title']);
      context('review.types.source', subject['source_title']);
    } else if (kind === 'assessment') {
      context('review.types.source', subject['source_title']);
    } else if (kind === 'report') {
      context('review.fields.reportedItem', subject['target_title']);
    }
    // The source of an evidence item is already shown by its title above.
    entries.push(
      ...describeRecord(kind, subject, kind === 'evidence' ? ['source_id'] : []),
    );

    title =
      kind === 'assessment'
        ? text(subject['source_title'])
        : kind === 'report'
          ? text(subject['target_title'])
          : text(subject['title']);
  }

  return {
    id: item.id,
    targetType: kind,
    title,
    submittedBy: item.submitted_by,
    submitterName: item.submitter_name,
    submittedAt: item.submitted_at,
    claimedBy: item.claimed_by,
    claimedByName: item.claimed_by_name,
    decidedAt: item.decided_at,
    entries,
    changes,
    decision: detail.decision
      ? {
          decision: detail.decision.decision,
          reason: detail.decision.reason,
          reviewerName: detail.decision.reviewer_name,
          decidedAt: detail.decision.decided_at,
        }
      : null,
  };
}
