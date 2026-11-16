import { z } from 'zod';
import { reportKinds, reportStatuses } from '@/lib/domain/enums';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { reportTargets, type ReportTarget } from './report-params';

const reportRowSchema = z.object({
  id: z.string(),
  kind: z.enum(reportKinds),
  target_type: z.enum(reportTargets),
  target_id: z.string(),
  reason: z.string(),
  status: z.enum(reportStatuses),
  created_at: z.string(),
});

export interface MyReport {
  id: string;
  kind: (typeof reportKinds)[number];
  targetType: ReportTarget;
  targetId: string;
  /** Null when the item can no longer be seen, for example after it was removed. */
  targetTitle: string | null;
  reason: string;
  status: (typeof reportStatuses)[number];
  createdAt: string;
}

const titleRowSchema = z.object({ id: z.string(), title: z.string() });
const tables = { claim: 'claims', source: 'sources', evidence: 'evidence' } as const;

async function titlesFor(
  target: ReportTarget,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(tables[target])
    .select('id, title')
    .in('id', ids);
  if (error) throw new Error(`Could not load report targets: ${error.message}`);
  return new Map(
    z
      .array(titleRowSchema)
      .parse(data)
      .map((row) => [row.id, row.title]),
  );
}

// The reader's own reports, newest first. Row level security already limits the
// table to them; the filter makes that explicit.
export async function listMyReports(userId: string): Promise<MyReport[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reports')
    .select('id, kind, target_type, target_id, reason, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(`Could not load your reports: ${error.message}`);

  const rows = z.array(reportRowSchema).parse(data);
  const titles = new Map<ReportTarget, Map<string, string>>();
  for (const target of reportTargets) {
    titles.set(
      target,
      await titlesFor(
        target,
        rows.filter((row) => row.target_type === target).map((row) => row.target_id),
      ),
    );
  }

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    targetType: row.target_type,
    targetId: row.target_id,
    targetTitle: titles.get(row.target_type)?.get(row.target_id) ?? null,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  }));
}
