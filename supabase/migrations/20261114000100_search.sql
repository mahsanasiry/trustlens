-- Full-text and substring search over published claims and sources.
--
-- The search vectors use the 'simple' configuration so that no language's
-- stemming rules are applied to another language's text. That leaves two gaps,
-- both closed by a substring match on the title (and the publisher of a source):
-- partial words ("transi" for "transit") and scripts written without spaces
-- such as Chinese and Japanese, which the vectors cannot split into words.
create function public.search_content(
  p_query text,
  p_kind text default 'all',
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
  with cleaned as (
    select left(btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')), 200) as text
  ),
  params as (
    select
      text,
      websearch_to_tsquery('simple', text) as tsq,
      -- Escape LIKE wildcards so a typed % or _ is searched for literally.
      '%' || replace(replace(replace(text, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    from cleaned
    -- One character is enough for scripts where a single character is a word.
    where char_length(text) >= 2 or text ~ '[^\x01-\x7F]'
  ),
  hits as (
    select
      'claim'::text as kind,
      c.id,
      c.title,
      c.language,
      c.category,
      c.status,
      null::public.source_type as source_type,
      null::text as publisher,
      c.released_at,
      ts_rank_cd(c.search_vector, p.tsq) + (case when c.title ilike p.pattern then 1 else 0 end) as score
    from public.claims c
    cross join params p
    where p_kind is distinct from 'source'
      and c.state = 'published'
      and c.deleted_at is null
      and (c.search_vector @@ p.tsq or c.title ilike p.pattern)
    union all
    select
      'source',
      s.id,
      s.title,
      s.language,
      null,
      null,
      s.type,
      s.publisher,
      s.released_at,
      ts_rank_cd(s.search_vector, p.tsq)
        + (case when s.title ilike p.pattern then 1 else 0 end)
        + (case when s.publisher ilike p.pattern then 0.5 else 0 end)
    from public.sources s
    cross join params p
    where p_kind is distinct from 'claim'
      and s.state = 'published'
      and s.deleted_at is null
      and (s.search_vector @@ p.tsq or s.title ilike p.pattern or s.publisher ilike p.pattern)
  )
  select
    h.kind, h.id, h.title, h.language, h.category, h.status, h.source_type, h.publisher,
    count(*) over ()
  from hits h
  order by h.score desc, h.released_at desc, h.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0)
$$;

revoke all on function public.search_content(text, text, integer, integer) from public;
grant execute on function public.search_content(text, text, integer, integer)
  to anon, authenticated;
