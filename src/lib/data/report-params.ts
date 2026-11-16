import { z } from 'zod';
import { reportKinds } from '@/lib/domain/enums';
import { isEntityId } from './params';
import { field, text } from './studio-params';

export const reportTargets = ['claim', 'source', 'evidence'] as const;
export type ReportTarget = (typeof reportTargets)[number];

export type ReportError = 'invalid' | 'duplicate' | 'limit' | 'forbidden' | 'failed';

// The values come back after a failed send because a form reset follows every
// action and would otherwise empty what the person wrote.
export type ReportState =
  | { id: number; status: 'idle' }
  | { id: number; status: 'sent' }
  | { id: number; status: 'error'; error: ReportError; values: Record<string, string> };

export interface ReportInput {
  kind: (typeof reportKinds)[number];
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  suggested_url: string | null;
}

const webAddress = /^https?:\/\/[^\s]+$/i;

const reportSchema = z.object({
  kind: z.enum(reportKinds),
  target_type: z.enum(reportTargets),
  target_id: z.string().refine(isEntityId),
  reason: text(3, 2000),
  suggested_url: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value === '' || webAddress.test(value))
    .transform((value) => (value === '' ? null : value)),
});

export function parseReport(form: FormData): ReportInput | null {
  const parsed = reportSchema.safeParse({
    kind: field(form, 'kind'),
    target_type: field(form, 'target_type'),
    target_id: field(form, 'target_id'),
    reason: field(form, 'reason'),
    suggested_url: field(form, 'suggested_url'),
  });
  return parsed.success ? parsed.data : null;
}
