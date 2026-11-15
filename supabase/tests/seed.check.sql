-- Checks run against a database that has the demo data loaded.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.claims where is_demo and state = 'published';
  if v_count < 60 then raise exception 'expected at least 60 published demo claims, found %', v_count; end if;

  select count(*) into v_count from public.sources where is_demo and state = 'published';
  if v_count < 100 then raise exception 'expected at least 100 published demo sources, found %', v_count; end if;

  select count(*) into v_count from public.evidence where is_demo and state = 'published';
  if v_count < 100 then raise exception 'expected at least 100 published demo evidence rows, found %', v_count; end if;

  select count(*) into v_count
  from public.evidence e join public.sources s on s.id = e.source_id
  where e.state = 'published' and s.state <> 'published';
  if v_count > 0 then raise exception '% published evidence rows point at unpublished sources', v_count; end if;

  -- The current status of every claim must be the end of its recorded history.
  select count(*) into v_count
  from public.claims c
  where exists (select 1 from public.claim_status_changes sc where sc.claim_id = c.id)
    and c.status is distinct from (
      select sc.to_status from public.claim_status_changes sc
      where sc.claim_id = c.id order by sc.created_at desc, sc.id desc limit 1
    );
  if v_count > 0 then raise exception '% claims disagree with their status history', v_count; end if;

  -- A claim that was revised keeps one stored version per version number.
  select count(*) into v_count
  from public.claims c
  where c.version > 1
    and (select count(*) from public.entity_versions v
         where v.entity_type = 'claim' and v.entity_id = c.id) <> c.version;
  if v_count > 0 then raise exception '% revised claims have an incomplete version history', v_count; end if;

  select count(*) into v_count from public.claims where version > 1;
  if v_count < 3 then raise exception 'expected revised claims, found %', v_count; end if;

  -- Every kind of review target should have something waiting in the queue.
  select count(distinct target_type) into v_count
  from public.review_items where decided_at is null;
  if v_count < 5 then raise exception 'expected open review items of 5 kinds, found %', v_count; end if;

  select count(*) into v_count from public.reviews where decision = 'rejected';
  if v_count < 1 then raise exception 'expected at least one rejected review'; end if;
  select count(*) into v_count from public.reviews where decision = 'changes_requested';
  if v_count < 1 then raise exception 'expected at least one changes_requested review'; end if;

  select count(*) into v_count from public.notifications;
  if v_count < 10 then raise exception 'expected generated notifications, found %', v_count; end if;

  select count(*) into v_count from public.audit_logs;
  if v_count < 500 then raise exception 'expected an audit history, found % rows', v_count; end if;

  -- Timestamps must never be in the future.
  select count(*) into v_count from public.claims where released_at > now() or created_at > now();
  if v_count > 0 then raise exception '% claims have future timestamps', v_count; end if;
  select count(*) into v_count from public.audit_logs where created_at > now();
  if v_count > 0 then raise exception '% audit rows have future timestamps', v_count; end if;
end
$$;

-- Visitors see only published, non-deleted content.
begin;
set local role anon;
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.claims where state <> 'published';
  if v_count > 0 then raise exception 'anon can see % unpublished claims', v_count; end if;
  select count(*) into v_count from public.sources where state <> 'published';
  if v_count > 0 then raise exception 'anon can see % unpublished sources', v_count; end if;
  select count(*) into v_count from public.evidence where state <> 'published';
  if v_count > 0 then raise exception 'anon can see % unpublished evidence rows', v_count; end if;
  select count(*) into v_count from public.collections where visibility = 'private';
  if v_count > 0 then raise exception 'anon can see % private collections', v_count; end if;
end
$$;
rollback;

select 'demo seed checks passed';
