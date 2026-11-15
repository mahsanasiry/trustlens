import { createServerSupabaseClient } from '@/lib/supabase/server';
import { emptyResultPage, toResultPage, type ResultPage } from './result-item';
import { isSearchable, searchPageSize, type SearchFilters } from './search-params';

export async function searchContent(filters: SearchFilters): Promise<ResultPage> {
  if (!isSearchable(filters.q)) return emptyResultPage(filters.page);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc('search_content', {
    p_query: filters.q,
    p_kind: filters.kind ?? 'all',
    p_limit: searchPageSize,
    p_offset: (filters.page - 1) * searchPageSize,
  });
  if (error) throw new Error(`Could not search: ${error.message}`);

  return toResultPage(data, filters.page, searchPageSize);
}
