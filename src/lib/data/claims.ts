import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  claimCategories,
  claimStatuses,
  evidencePositions,
  sourceTypes,
} from '@/lib/domain/enums';
import { claimsPageSize, isEntityId, type ClaimFilters } from './claim-params';

const claimSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(claimCategories),
  status: z.enum(claimStatuses),
  language: z.string(),
  released_at: z.string(),
  evidence: z.array(z.object({ position: z.enum(evidencePositions) })),
});

export type ClaimSummary = z.infer<typeof claimSummarySchema>;

export interface ClaimPage {
  items: ClaimSummary[];
  total: number;
  page: number;
  pageCount: number;
}

// PostgREST answers 416 when the requested range starts past the last row.
const rangeNotSatisfiable = 'PGRST103';

export async function listClaims(filters: ClaimFilters): Promise<ClaimPage> {
  const supabase = await createServerSupabaseClient();
  const from = (filters.page - 1) * claimsPageSize;

  let query = supabase
    .from('claims')
    .select('id, title, category, status, language, released_at, evidence(position)', {
      count: 'exact',
    })
    .eq('state', 'published')
    .is('deleted_at', null)
    .eq('evidence.state', 'published')
    .is('evidence.deleted_at', null)
    .order('released_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, from + claimsPageSize - 1);

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, count, error } = await query;

  if (error) {
    if (error.code === rangeNotSatisfiable) {
      return { items: [], total: 0, page: filters.page, pageCount: 0 };
    }
    throw new Error(`Could not load claims: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    items: z.array(claimSummarySchema).parse(data),
    total,
    page: filters.page,
    pageCount: Math.ceil(total / claimsPageSize),
  };
}

const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  url: z.string(),
  published_on: z.string().nullable(),
  type: z.enum(sourceTypes),
  language: z.string(),
});

const evidenceSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  position: z.enum(evidencePositions),
  limitations: z.string(),
  researcher_note: z.string(),
  sort_order: z.number(),
  sources: sourceSchema.nullable(),
});

const claimDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(claimCategories),
  status: z.enum(claimStatuses),
  origin: z.string(),
  origin_url: z.string().nullable(),
  first_appeared_on: z.string().nullable(),
  language: z.string(),
  version: z.number(),
  updated_at: z.string(),
  evidence: z.array(evidenceSchema),
});

const statusChangeSchema = z.object({
  id: z.string(),
  from_status: z.enum(claimStatuses),
  to_status: z.enum(claimStatuses),
  reason: z.string(),
  created_at: z.string(),
});

const relatedSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(claimCategories),
  status: z.enum(claimStatuses),
  language: z.string(),
});

export type ClaimDetail = z.infer<typeof claimDetailSchema>;
export type EvidenceItem = z.infer<typeof evidenceSchema>;
export type StatusChange = z.infer<typeof statusChangeSchema>;
export type RelatedClaim = z.infer<typeof relatedSchema>;

export interface ClaimView {
  claim: ClaimDetail;
  statusChanges: StatusChange[];
  related: RelatedClaim[];
}

export async function getClaim(id: string): Promise<ClaimView | null> {
  if (!isEntityId(id)) return null;
  const supabase = await createServerSupabaseClient();

  const [claimResult, changesResult, relationsResult] = await Promise.all([
    supabase
      .from('claims')
      .select(
        `id, title, description, category, status, origin, origin_url, first_appeared_on,
         language, version, updated_at,
         evidence(id, title, summary, position, limitations, researcher_note, sort_order,
           sources(id, title, publisher, url, published_on, type, language))`,
      )
      .eq('id', id)
      .eq('state', 'published')
      .is('deleted_at', null)
      .eq('evidence.state', 'published')
      .is('evidence.deleted_at', null)
      .order('sort_order', { referencedTable: 'evidence', ascending: true })
      .maybeSingle(),
    supabase
      .from('claim_status_changes')
      .select('id, from_status, to_status, reason, created_at')
      .eq('claim_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('claim_relations')
      .select('claim_id, related_claim_id')
      .or(`claim_id.eq.${id},related_claim_id.eq.${id}`),
  ]);

  if (claimResult.error) {
    throw new Error(`Could not load the claim: ${claimResult.error.message}`);
  }
  if (!claimResult.data) return null;
  if (changesResult.error) {
    throw new Error(`Could not load the status history: ${changesResult.error.message}`);
  }
  if (relationsResult.error) {
    throw new Error(`Could not load related claims: ${relationsResult.error.message}`);
  }

  const relatedIds = [
    ...new Set(
      relationsResult.data.map((row) =>
        row.claim_id === id ? row.related_claim_id : row.claim_id,
      ),
    ),
  ];

  let related: RelatedClaim[] = [];
  if (relatedIds.length > 0) {
    const relatedResult = await supabase
      .from('claims')
      .select('id, title, category, status, language')
      .in('id', relatedIds)
      .eq('state', 'published')
      .is('deleted_at', null)
      .order('title', { ascending: true });
    if (relatedResult.error) {
      throw new Error(`Could not load related claims: ${relatedResult.error.message}`);
    }
    related = z.array(relatedSchema).parse(relatedResult.data);
  }

  return {
    claim: claimDetailSchema.parse(claimResult.data),
    statusChanges: z.array(statusChangeSchema).parse(changesResult.data),
    related,
  };
}
