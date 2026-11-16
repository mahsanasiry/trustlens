import { z } from 'zod';
import {
  assessmentCriteria,
  contentStates,
  criterionStatuses,
  evidencePositions,
  type AssessmentCriterion,
} from '@/lib/domain/enums';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isEntityId } from './params';
import type { WorkItem } from './studio';

const evidenceRecordSchema = z.object({
  id: z.string(),
  claim_id: z.string(),
  source_id: z.string(),
  title: z.string(),
  summary: z.string(),
  position: z.enum(evidencePositions),
  limitations: z.string(),
  researcher_note: z.string(),
  state: z.enum(contentStates),
});
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;

const evidenceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  state: z.enum(contentStates),
  updated_at: z.string(),
});

// The author's own evidence for one claim, newest first.
export async function listClaimEvidence(
  claimId: string,
  userId: string,
): Promise<WorkItem[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('evidence')
    .select('id, title, state, updated_at')
    .eq('claim_id', claimId)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(`Could not list evidence: ${error.message}`);

  return z
    .array(evidenceItemSchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      title: row.title,
      state: row.state,
      updatedAt: row.updated_at,
    }));
}

export async function getOwnEvidence(
  id: string,
  userId: string,
): Promise<EvidenceRecord | null> {
  if (!isEntityId(id)) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('evidence')
    .select(
      'id, claim_id, source_id, title, summary, position, limitations, researcher_note, state',
    )
    .eq('id', id)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the evidence: ${error.message}`);
  return data ? evidenceRecordSchema.parse(data) : null;
}

const claimTitleSchema = z.object({ title: z.string() });

export async function getClaimTitle(claimId: string): Promise<string | null> {
  if (!isEntityId(claimId)) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('claims')
    .select('title')
    .eq('id', claimId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the claim: ${error.message}`);
  return data ? claimTitleSchema.parse(data).title : null;
}

const pickableSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
});
export type PickableSource = z.infer<typeof pickableSchema>;

// Row level security decides what is visible: published sources and the
// author's own. The list is capped so the picker stays usable.
export async function listPickableSources(): Promise<PickableSource[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('sources')
    .select('id, title, publisher')
    .is('deleted_at', null)
    .order('title', { ascending: true })
    .limit(300);
  if (error) throw new Error(`Could not list sources: ${error.message}`);
  return z.array(pickableSchema).parse(data);
}

const assessmentRecordSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  criterion: z.enum(assessmentCriteria),
  status: z.enum(criterionStatuses),
  notes: z.string(),
  state: z.enum(contentStates),
});
export type AssessmentRecord = z.infer<typeof assessmentRecordSchema>;

const assessmentColumns = 'id, source_id, criterion, status, notes, state';

export async function listOwnAssessments(
  sourceId: string,
  userId: string,
): Promise<AssessmentRecord[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('source_assessments')
    .select(assessmentColumns)
    .eq('source_id', sourceId)
    .eq('author_id', userId)
    .is('deleted_at', null);
  if (error) throw new Error(`Could not list checks: ${error.message}`);
  return z.array(assessmentRecordSchema).parse(data);
}

export async function getOwnAssessment(
  sourceId: string,
  criterion: AssessmentCriterion,
  userId: string,
): Promise<AssessmentRecord | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('source_assessments')
    .select(assessmentColumns)
    .eq('source_id', sourceId)
    .eq('criterion', criterion)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the check: ${error.message}`);
  return data ? assessmentRecordSchema.parse(data) : null;
}

export async function getOwnAssessmentById(
  id: string,
  userId: string,
): Promise<AssessmentRecord | null> {
  if (!isEntityId(id)) return null;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('source_assessments')
    .select(assessmentColumns)
    .eq('id', id)
    .eq('author_id', userId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(`Could not load the check: ${error.message}`);
  return data ? assessmentRecordSchema.parse(data) : null;
}
