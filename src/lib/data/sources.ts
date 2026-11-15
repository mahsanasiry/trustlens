import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  claimCategories,
  claimStatuses,
  evidencePositions,
  sourceTypes,
  type EvidencePosition,
} from '@/lib/domain/enums';
import { assessmentSchema } from './assessments';
import { isEntityId } from './params';
import { sourcesPageSize, type SourceFilters } from './source-params';

const sourceBase = {
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  type: z.enum(sourceTypes),
  language: z.string(),
  published_on: z.string().nullable(),
  source_assessments: z.array(assessmentSchema),
};

const sourceSummarySchema = z.object(sourceBase);
export type SourceSummary = z.infer<typeof sourceSummarySchema>;

const assessmentColumns = 'source_assessments(criterion, status, notes)';

// Embedded rows are filtered here as well as by row-level security, so an
// author's own drafts never show up in a public listing.
const assessmentFilters = {
  state: 'source_assessments.state',
  deleted: 'source_assessments.deleted_at',
} as const;

export interface SourcePage {
  items: SourceSummary[];
  total: number;
  page: number;
  pageCount: number;
}

const rangeNotSatisfiable = 'PGRST103';

export async function listSources(filters: SourceFilters): Promise<SourcePage> {
  const supabase = await createServerSupabaseClient();
  const from = (filters.page - 1) * sourcesPageSize;

  let query = supabase
    .from('sources')
    .select(`id, title, publisher, type, language, published_on, ${assessmentColumns}`, {
      count: 'exact',
    })
    .eq('state', 'published')
    .is('deleted_at', null)
    .eq(assessmentFilters.state, 'published')
    .is(assessmentFilters.deleted, null)
    .order('released_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, from + sourcesPageSize - 1);

  if (filters.type) query = query.eq('type', filters.type);

  const { data, count, error } = await query;
  if (error) {
    if (error.code === rangeNotSatisfiable) {
      return { items: [], total: 0, page: filters.page, pageCount: 0 };
    }
    throw new Error(`Could not load sources: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    items: z.array(sourceSummarySchema).parse(data),
    total,
    page: filters.page,
    pageCount: Math.ceil(total / sourcesPageSize),
  };
}

const citingClaimSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum(claimCategories),
  status: z.enum(claimStatuses),
  language: z.string(),
});

const sourceDetailSchema = z.object({
  ...sourceBase,
  url: z.string(),
  authors: z.array(z.string()),
  accessed_on: z.string().nullable(),
  evidence: z.array(
    z.object({
      id: z.string(),
      position: z.enum(evidencePositions),
      claims: citingClaimSchema.nullable(),
    }),
  ),
});

export interface Citation {
  evidenceId: string;
  position: EvidencePosition;
  claim: z.infer<typeof citingClaimSchema>;
}

export type SourceDetail = Omit<z.infer<typeof sourceDetailSchema>, 'evidence'> & {
  citedBy: Citation[];
};

export async function getSource(id: string): Promise<SourceDetail | null> {
  if (!isEntityId(id)) return null;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('sources')
    .select(
      `id, title, publisher, type, language, published_on, accessed_on, url, authors,
       ${assessmentColumns},
       evidence(id, position, claims(id, title, category, status, language))`,
    )
    .eq('id', id)
    .eq('state', 'published')
    .is('deleted_at', null)
    .eq(assessmentFilters.state, 'published')
    .is(assessmentFilters.deleted, null)
    .eq('evidence.state', 'published')
    .is('evidence.deleted_at', null)
    .eq('evidence.claims.state', 'published')
    .is('evidence.claims.deleted_at', null)
    .maybeSingle();

  if (error) throw new Error(`Could not load the source: ${error.message}`);
  if (!data) return null;

  const { evidence, ...source } = sourceDetailSchema.parse(data);
  const citedBy = evidence.flatMap((item) =>
    item.claims
      ? [{ evidenceId: item.id, position: item.position, claim: item.claims }]
      : [],
  );
  return { ...source, citedBy };
}

export async function getSourcesForComparison(
  ids: readonly string[],
): Promise<SourceDetail[]> {
  if (ids.length === 0) return [];
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('sources')
    .select(
      `id, title, publisher, type, language, published_on, accessed_on, url, authors,
       ${assessmentColumns}`,
    )
    .in('id', [...ids])
    .eq('state', 'published')
    .is('deleted_at', null)
    .eq(assessmentFilters.state, 'published')
    .is(assessmentFilters.deleted, null);

  if (error) throw new Error(`Could not load sources to compare: ${error.message}`);

  const parsed = z
    .array(sourceDetailSchema.omit({ evidence: true }))
    .parse(data)
    .map((source) => ({ ...source, citedBy: [] }));
  // Keep the order the reader chose, whatever order the database returns.
  return ids.flatMap((id) => parsed.filter((source) => source.id === id));
}
