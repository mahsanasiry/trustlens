-- A summary of the review queue for admins: how much is waiting, how much of it is
-- already taken, how long the oldest item has waited and how many were decided
-- in the last seven days.
create function public.review_overview() returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_by_type jsonb;
  v_open integer;
  v_claimed integer;
  v_oldest timestamptz;
  v_decided integer;
begin
  if not private.is_admin() then
    raise exception 'only admins can review' using errcode = '42501';
  end if;

  select
    coalesce(jsonb_object_agg(t.target_type, t.n), '{}'::jsonb),
    coalesce(sum(t.n), 0),
    coalesce(sum(t.taken), 0),
    min(t.oldest)
  into v_by_type, v_open, v_claimed, v_oldest
  from (
    select target_type, count(*)::integer as n,
           count(claimed_by)::integer as taken, min(submitted_at) as oldest
    from public.review_items
    where decided_at is null
    group by target_type
  ) t;

  select count(*)::integer into v_decided
  from public.review_items
  where decided_at >= now() - interval '7 days';

  return jsonb_build_object(
    'open', v_open,
    'claimed', v_claimed,
    'unclaimed', v_open - v_claimed,
    'by_type', v_by_type,
    'oldest_submitted_at', v_oldest,
    'decided_last_7_days', v_decided
  );
end
$$;

revoke all on function public.review_overview() from public, anon;
grant execute on function public.review_overview() to authenticated;
