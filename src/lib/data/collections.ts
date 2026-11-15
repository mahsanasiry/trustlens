import { z } from 'zod';
import { collectionVisibilities } from '@/lib/domain/enums';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { collectionItemsPageSize, collectionsPageSize } from './collection-params';
import { isEntityId } from './params';
import { toResultPage, type ResultPage } from './result-item';

const collectionRowsSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    visibility: z.enum(collectionVisibilities),
    item_count: z.number(),
    total_count: z.number(),
  }),
);

export interface CollectionSummary {
  id: string;
  title: string;
  description: string;
  visibility: (typeof collectionVisibilities)[number];
  itemCount: number;
}

export interface CollectionPage {
  items: CollectionSummary[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listMyCollections(page: number): Promise<CollectionPage> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('list_my_collections', {
    p_limit: collectionsPageSize,
    p_offset: (page - 1) * collectionsPageSize,
  });
  if (error) throw new Error(`Could not list collections: ${error.message}`);

  const rows = collectionRowsSchema.parse(data);
  const total = rows[0]?.total_count ?? 0;
  return {
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      visibility: row.visibility,
      itemCount: row.item_count,
    })),
    total,
    page,
    pageCount: Math.ceil(total / collectionsPageSize),
  };
}

// The few collections offered in the "add to collection" menu on a claim or
// source page. Nobody is expected to own more than this many.
const choiceLimit = 50;

export async function listCollectionChoices(): Promise<{ id: string; title: string }[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('list_my_collections', {
    p_limit: choiceLimit,
    p_offset: 0,
  });
  if (error) throw new Error(`Could not list collections: ${error.message}`);
  return collectionRowsSchema
    .parse(data)
    .map((row) => ({ id: row.id, title: row.title }));
}

const ownedCollectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  visibility: z.enum(collectionVisibilities),
  share_token: z.string(),
  owner_id: z.string(),
});
export type OwnedCollection = z.infer<typeof ownedCollectionSchema>;

// Returns null for anything the signed-in user does not own, whether it is
// missing, private to someone else or public: the manage page is for owners.
export async function getOwnedCollection(
  id: string,
  userId: string,
): Promise<OwnedCollection | null> {
  if (!isEntityId(id)) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('collections')
    .select('id, title, description, visibility, share_token, owner_id')
    .eq('id', id)
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load the collection: ${error.message}`);
  return data ? ownedCollectionSchema.parse(data) : null;
}

export interface CollectionItemsPage extends ResultPage {
  itemIds: string[];
}

const itemIdsSchema = z.array(z.object({ item_id: z.string() }));

export async function listCollectionItems(
  collectionId: string,
  page: number,
): Promise<CollectionItemsPage> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('list_collection_items', {
    p_collection_id: collectionId,
    p_limit: collectionItemsPageSize,
    p_offset: (page - 1) * collectionItemsPageSize,
  });
  if (error) throw new Error(`Could not list the collection: ${error.message}`);

  return {
    ...toResultPage(data, page, collectionItemsPageSize),
    itemIds: itemIdsSchema.parse(data).map((row) => row.item_id),
  };
}

const sharedSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  owner_name: z.string(),
});
export type SharedCollection = z.infer<typeof sharedSummarySchema>;

export async function getSharedCollection(
  token: string,
): Promise<SharedCollection | null> {
  if (!isEntityId(token)) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('get_shared_collection_summary', {
    p_token: token,
  });
  if (error) throw new Error(`Could not load the shared collection: ${error.message}`);

  const [row] = z.array(sharedSummarySchema).parse(data);
  return row ?? null;
}

export async function listSharedCollectionItems(
  token: string,
  page: number,
): Promise<ResultPage> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('list_shared_collection_items', {
    p_token: token,
    p_limit: collectionItemsPageSize,
    p_offset: (page - 1) * collectionItemsPageSize,
  });
  if (error) throw new Error(`Could not list the shared collection: ${error.message}`);

  return toResultPage(data, page, collectionItemsPageSize);
}
