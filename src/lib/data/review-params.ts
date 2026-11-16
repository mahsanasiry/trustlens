import { z } from 'zod';
import { reviewDecisions, reviewTargets, type ReviewDecision } from '@/lib/domain/enums';
import { firstValue, optionalEnum, pageNumber, type RawParams } from './params';

export const queuePageSize = 20;

const queueFiltersSchema = z.object({
  type: optionalEnum(reviewTargets),
  page: pageNumber,
});
export type QueueFilters = z.infer<typeof queueFiltersSchema>;

export function parseQueueFilters(raw: RawParams): QueueFilters {
  return queueFiltersSchema.parse({
    type: firstValue(raw.type),
    page: firstValue(raw.page) ?? 1,
  });
}

export type ReviewError =
  'invalid' | 'forbidden' | 'taken' | 'reason' | 'blocked' | 'failed';
export type ReviewMessage = 'taken' | 'released' | 'decided';

// What the decision panel shows after an action. The id changes with every
// answer so the page can tell a new result from one it has already shown.
// A rejected decision carries the reason back, because a form reset follows
// every action and would otherwise empty the box.
export type ReviewState =
  | { id: number; status: 'idle' }
  | { id: number; status: 'done'; message: ReviewMessage }
  | { id: number; status: 'error'; error: ReviewError; reason: string };

const minReasonLength = 3;
const maxReasonLength = 1000;

// The database counts characters, not UTF-16 units.
const characters = (value: string) => Array.from(value).length;

export type DecisionInput =
  | { ok: true; decision: ReviewDecision; reason: string | null }
  | { ok: false; error: 'invalid' | 'reason' };

export function parseDecision(decision: unknown, reasonField: unknown): DecisionInput {
  const parsed = z.enum(reviewDecisions).safeParse(decision);
  if (!parsed.success) return { ok: false, error: 'invalid' };

  const reason = typeof reasonField === 'string' ? reasonField.trim() : '';
  if (characters(reason) > maxReasonLength) return { ok: false, error: 'invalid' };
  if (parsed.data !== 'approved' && characters(reason) < minReasonLength) {
    return { ok: false, error: 'reason' };
  }
  return { ok: true, decision: parsed.data, reason: reason === '' ? null : reason };
}

// Which decisions make sense for each kind of item: a report is accepted or
// dismissed, and everything else can also be sent back for changes.
export function decisionsFor(target: (typeof reviewTargets)[number]): ReviewDecision[] {
  return target === 'report'
    ? ['approved', 'rejected']
    : ['approved', 'changes_requested', 'rejected'];
}
