-- Pages that show the review queue or an author's own work refresh when rows change.
-- Realtime only delivers a change to someone who may read the row, so row level
-- security decides who hears about what.
--
-- The publication exists on Supabase; the guard keeps the migration safe to run
-- anywhere else, and the membership check keeps it safe to run twice.
do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;

  foreach v_table in array array[
    'review_items', 'claims', 'sources', 'evidence', 'source_assessments', 'notifications'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end
$$;
