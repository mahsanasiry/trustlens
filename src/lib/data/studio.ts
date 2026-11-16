import { z } from 'zod';
import {
  claimCategories,
  contentStates,
  sourceTypes,
  type ContentState,
} from '@/lib/domain/enums';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isEntityId } from './params';
import type { StudioKind } from './studio-params';

// A researcher is not expected to have more drafts than this on screen at once;
// the list is newest first, so older work drops off the end.
const workLimit = 100;

const workRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  state: z.enum(contentStates),
  updated_at: z.string(),
});

export interface WorkItem {
  id: string;
  title: string;
  state: ContentState;
  updatedAt: string;
}

export interface MyWork {
  claims: WorkItem[];
  sources: WorkItem[];
}

async function listWork(
  table: 'claims' | 'sources',
  userId: string,
): Promise<WorkItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select('id, title, state, updated_at')
    .eq('author_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(workLimit);
  if (error) throw new Error(`Could not list your ${table}: ${error.message}`);

  return z
    .array(workRowSchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      title: row.title,
      state: row.state,
      updatedAt: row.updated_at,
    }));
}

export async function listMyWork(userId: string): Promise<MyWork> {
  const [claims, sources] = await Promise.all([
    listWork('claims', userId),
    listWork('sources', userId),
  ]);
  return { claims, sources };
}

const claimRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(claimCategories),
  origin: z.string(),
  origin_url: z.string().nullable(),
  first_appeared_on: z.string().nullable(),
  keywords: z.array(z.string()),
  language: z.string(),
  state: z.enum(contentStates),
});
export type ClaimRecord = z.infer<typeof claimRecordSchema>;

const sourceRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.string(),
  authors: z.array(z.string()),
  published_on: z.string().nullable(),
  accessed_on: z.string().nullable(),
  type: z.enum(sourceTypes),
  language: z.string(),
  state: z.enum(contentStates),
});
export type SourceRecord = z.infer<typeof sourceRecordSchema>;

// Both lookups return null for anything that is missing or not the reader's own.
export async function getOwnClaim(
  id: string,
  userId: string,
): Promise<ClaimRecord | null> {
  if (!isEntityId(id)) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('claims')
    .select(
      'id, title, description, category, origin, origin_url, first_appeared_on, keywords, language, state',
    )
    .eq('id', id)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the claim: ${error.message}`);
  return data ? claimRecordSchema.parse(data) : null;
}

export async function getOwnSource(
  id: string,
  userId: string,
): Promise<SourceRecord | null> {
  if (!isEntityId(id)) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sources')
    .select(
      'id, title, publisher, url, authors, published_on, accessed_on, type, language, state',
    )
    .eq('id', id)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the source: ${error.message}`);
  return data ? sourceRecordSchema.parse(data) : null;
}

const decisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'changes_requested']),
  reason: z.string().nullable(),
});
export type LatestDecision = z.infer<typeof decisionSchema>;

// The reviewer's most recent answer, shown to the author so they know what to
// fix. Reviews of the author's own submissions are readable by them.
export async function getLatestDecision(
  kind: StudioKind,
  id: string,
): Promise<LatestDecision | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('decision, reason')
    .eq('target_type', kind)
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the review: ${error.message}`);
  return data ? decisionSchema.parse(data) : null;
}
