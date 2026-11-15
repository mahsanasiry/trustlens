-- The signed-in reader's saved claims and sources, newest first.
--
-- Rows whose target has since been unpublished or deleted are left out here
-- rather than in the application, so the page count and the total always agree
-- with what is shown. The bookmark itself is kept: if the item is published
-- again, it reappears.
create function public.list_bookmarks(
  p_limit integer default 12,
  p_offset integer default 0
) returns table (
  kind text,
  id uuid,
  title text,
  language text,
  category public.claim_category,
  status public.claim_status,
  source_type public.source_type,
  publisher text,
  total_count bigint
)
language sql stable set search_path = '' as $$
  with mine as (
    select
      b.id as bookmark_id,
      b.created_at,
      'claim'::text as kind,
      c.id,
      c.title,
      c.language,
      c.category,
      c.status,
      null::public.source_type as source_type,
      null::text as publisher
    from public.bookmarks b
    join public.claims c on c.id = b.claim_id
    where b.user_id = (select auth.uid())
      and c.state = 'published'
      and c.deleted_at is null
    union all
    select
      b.id,
      b.created_at,
      'source',
      s.id,
      s.title,
      s.language,
      null,
      null,
      s.type,
      s.publisher
    from public.bookmarks b
    join public.sources s on s.id = b.source_id
    where b.user_id = (select auth.uid())
      and s.state = 'published'
      and s.deleted_at is null
  )
  select
    m.kind, m.id, m.title, m.language, m.category, m.status, m.source_type, m.publisher,
    count(*) over ()
  from mine m
  order by m.created_at desc, m.bookmark_id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0)
$$;

revoke all on function public.list_bookmarks(integer, integer) from public, anon;
grant execute on function public.list_bookmarks(integer, integer) to authenticated;
