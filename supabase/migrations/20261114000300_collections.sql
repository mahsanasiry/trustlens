-- Collections: listing, ordering and sharing.
--
-- Only items that are currently published are listed or counted, so what a
-- reader sees always matches what a visitor would see through a share link.
-- Items that were unpublished or deleted after being added are kept and come
-- back if the item is published again.

create function public.list_my_collections(
  p_limit integer default 12,
  p_offset integer default 0
) returns table (
  id uuid,
  title text,
  description text,
  visibility public.collection_visibility,
  updated_at timestamptz,
  item_count bigint,
  total_count bigint
)
language sql stable set search_path = '' as $$
  select
    c.id,
    c.title,
    c.description,
    c.visibility,
    c.updated_at,
    (
      select count(*)
      from public.collection_items i
      left join public.claims cl on cl.id = i.claim_id
        and cl.state = 'published' and cl.deleted_at is null
      left join public.sources so on so.id = i.source_id
        and so.state = 'published' and so.deleted_at is null
      where i.collection_id = c.id and (cl.id is not null or so.id is not null)
    ),
    count(*) over ()
  from public.collections c
  where c.owner_id = (select auth.uid())
  order by c.updated_at desc, c.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0)
$$;

create function public.list_collection_items(
  p_collection_id uuid,
  p_limit integer default 12,
  p_offset integer default 0
) returns table (
  item_id uuid,
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
  with listed as (
    select
      i.id as item_id, i.position,
      'claim'::text as kind, c.id, c.title, c.language, c.category, c.status,
      null::public.source_type as source_type, null::text as publisher
    from public.collection_items i
    join public.claims c on c.id = i.claim_id
    where i.collection_id = p_collection_id and c.state = 'published' and c.deleted_at is null
    union all
    select
      i.id, i.position,
      'source', s.id, s.title, s.language, null, null, s.type, s.publisher
    from public.collection_items i
    join public.sources s on s.id = i.source_id
    where i.collection_id = p_collection_id and s.state = 'published' and s.deleted_at is null
  )
  select
    l.item_id, l.kind, l.id, l.title, l.language, l.category, l.status, l.source_type,
    l.publisher, count(*) over ()
  from listed l
  order by l.position, l.item_id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0)
$$;

-- Adds at the end. The collection row is updated first, which both proves the
-- caller owns it (row-level security) and serialises concurrent additions.
create function public.add_collection_item(
  p_collection_id uuid,
  p_kind text,
  p_item_id uuid
) returns void
language plpgsql set search_path = '' as $$
begin
  if p_kind not in ('claim', 'source') then
    raise exception 'unknown item kind' using errcode = '22023';
  end if;

  update public.collections set updated_at = now() where id = p_collection_id;
  if not found then
    raise exception 'collection not found' using errcode = '42501';
  end if;

  if p_kind = 'claim' then
    insert into public.collection_items (collection_id, claim_id, position)
    select p_collection_id, p_item_id, coalesce(max(position), 0) + 1
    from public.collection_items where collection_id = p_collection_id
    on conflict (collection_id, claim_id) do nothing;
  else
    insert into public.collection_items (collection_id, source_id, position)
    select p_collection_id, p_item_id, coalesce(max(position), 0) + 1
    from public.collection_items where collection_id = p_collection_id
    on conflict (collection_id, source_id) do nothing;
  end if;
end
$$;

-- Swaps an item with its neighbour among the items that are listed, then
-- renumbers them, so positions stay a clean 1..n whatever happened before.
create function public.move_collection_item(
  p_collection_id uuid,
  p_item_id uuid,
  p_direction integer
) returns void
language plpgsql set search_path = '' as $$
declare
  v_ids uuid[];
  v_index integer;
  v_target integer;
begin
  if p_direction not in (-1, 1) then
    raise exception 'direction must be -1 or 1' using errcode = '22023';
  end if;

  update public.collections set updated_at = now() where id = p_collection_id;
  if not found then
    raise exception 'collection not found' using errcode = '42501';
  end if;

  select array_agg(i.id order by i.position, i.id) into v_ids
  from public.collection_items i
  left join public.claims c on c.id = i.claim_id
    and c.state = 'published' and c.deleted_at is null
  left join public.sources s on s.id = i.source_id
    and s.state = 'published' and s.deleted_at is null
  where i.collection_id = p_collection_id and (c.id is not null or s.id is not null);

  v_index := array_position(v_ids, p_item_id);
  if v_index is null then
    raise exception 'item is not in this collection' using errcode = 'P0002';
  end if;

  v_target := v_index + p_direction;
  if v_target < 1 or v_target > cardinality(v_ids) then
    return;
  end if;

  v_ids[v_index] := v_ids[v_target];
  v_ids[v_target] := p_item_id;

  update public.collection_items i set position = o.ord::integer
  from unnest(v_ids) with ordinality as o(id, ord)
  where i.id = o.id;
end
$$;

-- Share links. These read through the link's token with the function's own
-- rights, because visitors have no access to unlisted collections otherwise.
create function public.get_shared_collection_summary(p_token uuid)
returns table (id uuid, title text, description text, owner_name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.description, p.display_name
  from public.collections c
  join public.profiles p on p.id = c.owner_id
  where c.share_token = p_token and c.visibility in ('public', 'unlisted')
$$;

create function public.list_shared_collection_items(
  p_token uuid,
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
language sql stable security definer set search_path = '' as $$
  with listed as (
    select
      i.position, i.id as item_id,
      'claim'::text as kind, c.id, c.title, c.language, c.category, c.status,
      null::public.source_type as source_type, null::text as publisher
    from public.collections col
    join public.collection_items i on i.collection_id = col.id
    join public.claims c on c.id = i.claim_id
    where col.share_token = p_token and col.visibility in ('public', 'unlisted')
      and c.state = 'published' and c.deleted_at is null
    union all
    select
      i.position, i.id,
      'source', s.id, s.title, s.language, null, null, s.type, s.publisher
    from public.collections col
    join public.collection_items i on i.collection_id = col.id
    join public.sources s on s.id = i.source_id
    where col.share_token = p_token and col.visibility in ('public', 'unlisted')
      and s.state = 'published' and s.deleted_at is null
  )
  select
    l.kind, l.id, l.title, l.language, l.category, l.status, l.source_type, l.publisher,
    count(*) over ()
  from listed l
  order by l.position, l.item_id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0)
$$;

revoke all on function
  public.list_my_collections(integer, integer),
  public.list_collection_items(uuid, integer, integer),
  public.add_collection_item(uuid, text, uuid),
  public.move_collection_item(uuid, uuid, integer),
  public.get_shared_collection_summary(uuid),
  public.list_shared_collection_items(uuid, integer, integer)
from public, anon;

grant execute on function
  public.list_my_collections(integer, integer),
  public.list_collection_items(uuid, integer, integer),
  public.add_collection_item(uuid, text, uuid),
  public.move_collection_item(uuid, uuid, integer)
to authenticated;

grant execute on function
  public.get_shared_collection_summary(uuid),
  public.list_shared_collection_items(uuid, integer, integer)
to anon, authenticated;
