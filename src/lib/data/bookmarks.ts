import { createServerSupabaseClient } from '@/lib/supabase/server';
import { bookmarksPageSize, type BookmarkKind } from './bookmark-params';
import { toResultPage, type ResultPage } from './result-item';

const column: Record<BookmarkKind, 'claim_id' | 'source_id'> = {
  claim: 'claim_id',
  source: 'source_id',
};

export function bookmarkColumn(kind: BookmarkKind) {
  return column[kind];
}

// Callers must have checked that someone is signed in: visitors have no access
// to the bookmarks table at all.
export async function isBookmarked(kind: BookmarkKind, id: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id')
    .eq(column[kind], id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the bookmark: ${error.message}`);
  return data !== null;
}

export async function listBookmarks(page: number): Promise<ResultPage> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('list_bookmarks', {
    p_limit: bookmarksPageSize,
    p_offset: (page - 1) * bookmarksPageSize,
  });
  if (error) throw new Error(`Could not list saved items: ${error.message}`);

  return toResultPage(data, page, bookmarksPageSize);
}
