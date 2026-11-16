-- The admin review queue: what is waiting, and everything an admin needs to decide
-- one item. Both functions answer admins only. They are not security definer, so
-- row level security still applies underneath.
create function public.list_review_queue(
  p_target public.review_target default null,
  p_limit integer default 20,
  p_offset integer default 0
) returns table (
  item_id uuid,
  target_type public.review_target,
  target_id uuid,
  title text,
  submitter_name text,
  submitted_at timestamptz,
  claimed_by uuid,
  claimed_by_name text,
  total_count bigint
)
language sql stable set search_path = '' as $$
  select
    i.id,
    i.target_type,
    i.target_id,
    case i.target_type
      when 'claim' then (select c.title from public.claims c where c.id = i.target_id)
      when 'source' then (select s.title from public.sources s where s.id = i.target_id)
      when 'evidence' then (select e.title from public.evidence e where e.id = i.target_id)
      when 'assessment' then (
        select s.title from public.source_assessments a
        join public.sources s on s.id = a.source_id where a.id = i.target_id
      )
      when 'revision' then (select r.change_summary from public.content_revisions r where r.id = i.target_id)
      else (select rp.reason from public.reports rp where rp.id = i.target_id)
    end,
    submitter.display_name,
    i.submitted_at,
    i.claimed_by,
    holder.display_name,
    count(*) over ()
  from public.review_items i
  left join public.profiles submitter on submitter.id = i.submitted_by
  left join public.profiles holder on holder.id = i.claimed_by
  where private.is_admin()
    and i.decided_at is null
    and (p_target is null or i.target_type = p_target)
  order by i.submitted_at, i.id
  limit least(greatest(p_limit, 1), 50)
  offset greatest(p_offset, 0)
$$;

-- One review item with its subject. For a revision the subject is the proposed
-- change and "current" is the item it would change; for a report the subject
-- carries the title of what was reported. The newest decision, if any, is included
-- so a decided item can still be read.
create function public.get_review_item(p_item_id uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_item public.review_items;
  v_subject jsonb;
  v_current jsonb;
  v_revision public.content_revisions;
  v_report public.reports;
  v_decision jsonb;
begin
  if not private.is_admin() then
    raise exception 'only admins can review' using errcode = '42501';
  end if;

  select * into v_item from public.review_items where id = p_item_id;
  if not found then
    return null;
  end if;

  if v_item.target_type = 'claim' then
    select to_jsonb(c) - 'search_vector' into v_subject from public.claims c where c.id = v_item.target_id;
  elsif v_item.target_type = 'source' then
    select to_jsonb(s) - 'search_vector' into v_subject from public.sources s where s.id = v_item.target_id;
  elsif v_item.target_type = 'evidence' then
    select to_jsonb(e) || jsonb_build_object(
      'claim_title', c.title, 'source_title', s.title, 'source_state', s.state
    ) into v_subject
    from public.evidence e
    join public.claims c on c.id = e.claim_id
    join public.sources s on s.id = e.source_id
    where e.id = v_item.target_id;
  elsif v_item.target_type = 'assessment' then
    select to_jsonb(a) || jsonb_build_object('source_title', s.title) into v_subject
    from public.source_assessments a
    join public.sources s on s.id = a.source_id
    where a.id = v_item.target_id;
  elsif v_item.target_type = 'revision' then
    select * into v_revision from public.content_revisions where id = v_item.target_id;
    v_subject := to_jsonb(v_revision);
    v_current := case v_revision.entity_type
      when 'claim' then (select to_jsonb(c) - 'search_vector' from public.claims c where c.id = v_revision.entity_id)
      when 'source' then (select to_jsonb(s) - 'search_vector' from public.sources s where s.id = v_revision.entity_id)
      when 'evidence' then (select to_jsonb(e) from public.evidence e where e.id = v_revision.entity_id)
      else (select to_jsonb(a) from public.source_assessments a where a.id = v_revision.entity_id)
    end;
  else
    select * into v_report from public.reports where id = v_item.target_id;
    v_subject := to_jsonb(v_report) || jsonb_build_object(
      'reporter_name', (select p.display_name from public.profiles p where p.id = v_report.user_id),
      'target_title', case v_report.target_type
        when 'claim' then (select c.title from public.claims c where c.id = v_report.target_id)
        when 'source' then (select s.title from public.sources s where s.id = v_report.target_id)
        else (select e.title from public.evidence e where e.id = v_report.target_id)
      end
    );
  end if;

  select jsonb_build_object(
    'decision', r.decision,
    'reason', r.reason,
    'reviewer_name', p.display_name,
    'decided_at', r.created_at
  ) into v_decision
  from public.reviews r
  left join public.profiles p on p.id = r.reviewer_id
  where r.review_item_id = v_item.id
  order by r.created_at desc
  limit 1;

  return jsonb_build_object(
    'item', jsonb_build_object(
      'id', v_item.id,
      'target_type', v_item.target_type,
      'target_id', v_item.target_id,
      'submitted_by', v_item.submitted_by,
      'submitter_name', (select p.display_name from public.profiles p where p.id = v_item.submitted_by),
      'submitted_at', v_item.submitted_at,
      'claimed_by', v_item.claimed_by,
      'claimed_by_name', (select p.display_name from public.profiles p where p.id = v_item.claimed_by),
      'decided_at', v_item.decided_at
    ),
    'subject', v_subject,
    'current', v_current,
    'decision', v_decision
  );
end
$$;

revoke all on function public.list_review_queue(public.review_target, integer, integer) from public, anon;
revoke all on function public.get_review_item(uuid) from public, anon;
grant execute on function public.list_review_queue(public.review_target, integer, integer) to authenticated;
grant execute on function public.get_review_item(uuid) to authenticated;
