create function private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  return v_uid;
end
$$;

create function private.lock_entity(p_type public.content_entity, p_id uuid)
returns table (owner_id uuid, entity_state public.content_state, entity_version integer, is_deleted boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if p_type = 'claim' then
    return query
      select c.author_id, c.state, c.version, c.deleted_at is not null
      from public.claims c where c.id = p_id for update;
  elsif p_type = 'source' then
    return query
      select s.author_id, s.state, s.version, s.deleted_at is not null
      from public.sources s where s.id = p_id for update;
  elsif p_type = 'evidence' then
    return query
      select e.author_id, e.state, e.version, e.deleted_at is not null
      from public.evidence e where e.id = p_id for update;
  else
    return query
      select a.author_id, a.state, a.version, a.deleted_at is not null
      from public.source_assessments a where a.id = p_id for update;
  end if;

  if not found then
    raise exception '% % does not exist', p_type, p_id using errcode = 'P0002';
  end if;
end
$$;

create function private.set_entity_state(
  p_type public.content_entity, p_id uuid, p_state public.content_state
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_type = 'claim' then
    update public.claims set state = p_state where id = p_id;
  elsif p_type = 'source' then
    update public.sources set state = p_state where id = p_id;
  elsif p_type = 'evidence' then
    update public.evidence set state = p_state where id = p_id;
  else
    update public.source_assessments set state = p_state where id = p_id;
  end if;
end
$$;

create function private.validate_payload(p_type public.content_entity, p_payload jsonb)
returns void
language plpgsql set search_path = '' as $$
declare
  v_spec jsonb;
  v_key text;
  v_type text;
  v_nullable boolean;
  v_value jsonb;
begin
  -- A trailing question mark marks a field that may be cleared with null.
  v_spec := case p_type
    when 'claim' then '{
      "title": "text", "description": "text", "category": "claim_category", "origin": "text",
      "origin_url": "text?", "first_appeared_on": "date?", "keywords": "text[]", "language": "text"
    }'::jsonb
    when 'source' then '{
      "title": "text", "publisher": "text", "url": "text", "authors": "text[]",
      "published_on": "date?", "accessed_on": "date?", "type": "source_type", "language": "text"
    }'::jsonb
    when 'evidence' then '{
      "title": "text", "summary": "text", "position": "evidence_position",
      "limitations": "text", "researcher_note": "text", "source_id": "uuid"
    }'::jsonb
    else '{"status": "criterion_status", "notes": "text"}'::jsonb
  end;

  if jsonb_typeof(p_payload) is distinct from 'object' or p_payload = '{}'::jsonb then
    raise exception 'the change must contain at least one field' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_payload) loop
    if not v_spec ? v_key then
      raise exception 'field "%" cannot be changed through a revision', v_key
        using errcode = '22023';
    end if;

    v_type := v_spec ->> v_key;
    v_nullable := right(v_type, 1) = '?';
    v_type := rtrim(v_type, '?');
    v_value := p_payload -> v_key;

    if jsonb_typeof(v_value) = 'null' then
      if not v_nullable then
        raise exception 'field "%" cannot be empty', v_key using errcode = '22023';
      end if;
    elsif v_type = 'text[]' then
      if jsonb_typeof(v_value) <> 'array'
         or exists (
           select 1 from jsonb_array_elements(v_value) e where jsonb_typeof(e) <> 'string'
         ) then
        raise exception 'field "%" must be a list of text values', v_key using errcode = '22023';
      end if;
    elsif jsonb_typeof(v_value) <> 'string' then
      raise exception 'field "%" must be text', v_key using errcode = '22023';
    elsif v_type <> 'text' then
      begin
        execute format('select %L::%s', v_value #>> '{}', case v_type
          when 'date' then 'date'
          when 'uuid' then 'uuid'
          else 'public.' || quote_ident(v_type)
        end);
      exception when others then
        raise exception 'field "%" has an invalid value', v_key using errcode = '22023';
      end;
    end if;

    if v_key in ('url', 'origin_url') and jsonb_typeof(v_value) = 'string'
       and (v_value #>> '{}') !~* '^https?://[^\s]+$' then
      raise exception 'field "%" must be an http or https address', v_key using errcode = '22023';
    end if;
  end loop;
end
$$;

create function private.notify_correction(
  p_type public.content_entity, p_id uuid, p_summary text, p_except uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb := jsonb_build_object(
    'entity_type', p_type, 'entity_id', p_id, 'summary', p_summary
  );
  v_claim uuid;
  v_source uuid;
begin
  if p_type = 'claim' then
    v_claim := p_id;
  elsif p_type = 'evidence' then
    select claim_id into v_claim from public.evidence where id = p_id;
  elsif p_type = 'source' then
    v_source := p_id;
  else
    select source_id into v_source from public.source_assessments where id = p_id;
  end if;

  perform private.notify(b.user_id, 'correction_published', v_payload)
  from public.bookmarks b
  where b.user_id is distinct from p_except
    and ((v_claim is not null and b.claim_id = v_claim)
      or (v_source is not null and b.source_id = v_source));
end
$$;

create function private.apply_revision(p_revision public.content_revisions) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_p jsonb := p_revision.payload;
  v_locked record;
begin
  select * into v_locked from private.lock_entity(p_revision.entity_type, p_revision.entity_id);
  if v_locked.is_deleted then
    raise exception 'the target has been deleted' using errcode = '22023';
  end if;
  if v_locked.entity_version <> p_revision.base_version then
    raise exception 'the target changed after this revision was proposed'
      using errcode = '40001';
  end if;

  perform set_config('private.change_summary', p_revision.change_summary, true);

  if p_revision.entity_type = 'claim' then
    update public.claims set
      title = coalesce(v_p ->> 'title', title),
      description = coalesce(v_p ->> 'description', description),
      category = coalesce((v_p ->> 'category')::public.claim_category, category),
      origin = coalesce(v_p ->> 'origin', origin),
      origin_url = case when v_p ? 'origin_url' then v_p ->> 'origin_url' else origin_url end,
      first_appeared_on = case when v_p ? 'first_appeared_on'
        then (v_p ->> 'first_appeared_on')::date else first_appeared_on end,
      keywords = case when v_p ? 'keywords'
        then array(select jsonb_array_elements_text(v_p -> 'keywords')) else keywords end,
      language = coalesce(v_p ->> 'language', language)
    where id = p_revision.entity_id;
  elsif p_revision.entity_type = 'source' then
    update public.sources set
      title = coalesce(v_p ->> 'title', title),
      publisher = coalesce(v_p ->> 'publisher', publisher),
      url = coalesce(v_p ->> 'url', url),
      authors = case when v_p ? 'authors'
        then array(select jsonb_array_elements_text(v_p -> 'authors')) else authors end,
      published_on = case when v_p ? 'published_on'
        then (v_p ->> 'published_on')::date else published_on end,
      accessed_on = case when v_p ? 'accessed_on'
        then (v_p ->> 'accessed_on')::date else accessed_on end,
      type = coalesce((v_p ->> 'type')::public.source_type, type),
      language = coalesce(v_p ->> 'language', language)
    where id = p_revision.entity_id;
  elsif p_revision.entity_type = 'evidence' then
    if v_p ? 'source_id' and not exists (
      select 1 from public.sources
      where id = (v_p ->> 'source_id')::uuid and state = 'published' and deleted_at is null
    ) then
      raise exception 'the source must be published first' using errcode = '22023';
    end if;
    update public.evidence set
      title = coalesce(v_p ->> 'title', title),
      summary = coalesce(v_p ->> 'summary', summary),
      position = coalesce((v_p ->> 'position')::public.evidence_position, position),
      limitations = coalesce(v_p ->> 'limitations', limitations),
      researcher_note = coalesce(v_p ->> 'researcher_note', researcher_note),
      source_id = coalesce((v_p ->> 'source_id')::uuid, source_id)
    where id = p_revision.entity_id;
  else
    update public.source_assessments set
      status = coalesce((v_p ->> 'status')::public.criterion_status, status),
      notes = coalesce(v_p ->> 'notes', notes)
    where id = p_revision.entity_id;
  end if;

  perform set_config('private.change_summary', '', true);
  perform private.notify_correction(
    p_revision.entity_type, p_revision.entity_id, p_revision.change_summary, p_revision.author_id
  );
end
$$;

create function public.submit_for_review(p_entity_type public.content_entity, p_entity_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_row record;
begin
  select * into v_row from private.lock_entity(p_entity_type, p_entity_id);

  if not (private.is_admin() or (private.is_staff() and v_row.owner_id = v_uid)) then
    raise exception 'only the author can submit this for review' using errcode = '42501';
  end if;
  if v_row.is_deleted or v_row.entity_state not in ('draft', 'changes_requested') then
    raise exception 'only drafts and items with requested changes can be submitted'
      using errcode = '22023';
  end if;

  perform private.set_entity_state(p_entity_type, p_entity_id, 'pending_review');
  insert into public.review_items (target_type, target_id, submitted_by)
  values (p_entity_type::text::public.review_target, p_entity_id, v_uid);
end
$$;

create function public.propose_revision(
  p_entity_type public.content_entity,
  p_entity_id uuid,
  p_payload jsonb,
  p_summary text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_row record;
  v_id uuid;
begin
  if not private.is_staff() then
    raise exception 'only researchers and admins can propose changes' using errcode = '42501';
  end if;

  select * into v_row from private.lock_entity(p_entity_type, p_entity_id);
  if v_row.is_deleted or v_row.entity_state <> 'published' then
    raise exception 'only published content can receive a revision' using errcode = '22023';
  end if;

  perform private.validate_payload(p_entity_type, p_payload);

  insert into public.content_revisions (
    entity_type, entity_id, base_version, payload, change_summary, author_id
  ) values (
    p_entity_type, p_entity_id, v_row.entity_version, p_payload, p_summary, v_uid
  ) returning id into v_id;

  insert into public.review_items (target_type, target_id, submitted_by)
  values ('revision', v_id, v_uid);
  return v_id;
end
$$;

create function public.claim_review_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
begin
  if not private.is_admin() then
    raise exception 'only admins can review' using errcode = '42501';
  end if;

  update public.review_items
  set claimed_by = v_uid, claimed_at = now()
  where id = p_item_id and decided_at is null and (claimed_by is null or claimed_by = v_uid);
  if not found then
    raise exception 'this item is already decided or claimed by someone else'
      using errcode = '55006';
  end if;
end
$$;

create function public.release_review_item(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
begin
  if not private.is_admin() then
    raise exception 'only admins can review' using errcode = '42501';
  end if;

  update public.review_items
  set claimed_by = null, claimed_at = null
  where id = p_item_id and decided_at is null and claimed_by = v_uid;
  if not found then
    raise exception 'you do not hold this item' using errcode = '55006';
  end if;
end
$$;

create function public.decide_review(
  p_item_id uuid,
  p_decision public.review_decision,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_item public.review_items;
  v_state public.content_state;
  v_revision public.content_revisions;
  v_report public.reports;
  v_report_status public.report_status;
  v_claim uuid;
  v_author uuid;
begin
  if not private.is_admin() then
    raise exception 'only admins can review' using errcode = '42501';
  end if;

  select * into v_item from public.review_items where id = p_item_id for update;
  if not found then
    raise exception 'review item does not exist' using errcode = 'P0002';
  end if;
  if v_item.decided_at is not null then
    raise exception 'this item has already been decided' using errcode = '55006';
  end if;
  if v_item.claimed_by is not null and v_item.claimed_by <> v_uid then
    raise exception 'this item is claimed by another reviewer' using errcode = '55006';
  end if;
  if p_decision = 'approved' and v_item.submitted_by = v_uid then
    raise exception 'a different admin must approve your own submission' using errcode = '42501';
  end if;
  if p_decision <> 'approved' and char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  v_state := case p_decision
    when 'approved' then 'published'
    when 'rejected' then 'rejected'
    else 'changes_requested'
  end::public.content_state;

  if v_item.target_type = 'report' then
    if p_decision = 'changes_requested' then
      raise exception 'reports can only be accepted or dismissed' using errcode = '22023';
    end if;
    v_report_status := case p_decision when 'approved' then 'resolved' else 'dismissed' end;
    update public.reports set status = v_report_status, resolved_at = now()
    where id = v_item.target_id returning * into v_report;
    perform private.notify(
      v_report.user_id, 'report_status_changed',
      jsonb_build_object('report_id', v_report.id, 'status', v_report_status, 'reason', p_reason)
    );
  elsif v_item.target_type = 'revision' then
    select * into v_revision from public.content_revisions where id = v_item.target_id for update;
    if p_decision = 'approved' then
      perform private.apply_revision(v_revision);
    end if;
    update public.content_revisions set state = v_state, decided_at = now()
    where id = v_revision.id;
    v_author := v_revision.author_id;
  else
    if v_item.target_type = 'evidence' and p_decision = 'approved' and not exists (
      select 1 from public.evidence e
      join public.sources s on s.id = e.source_id
      where e.id = v_item.target_id and s.state = 'published' and s.deleted_at is null
    ) then
      raise exception 'the source must be published first' using errcode = '22023';
    end if;

    perform private.set_entity_state(v_item.target_type::text::public.content_entity, v_item.target_id, v_state);
    v_author := v_item.submitted_by;

    if v_item.target_type = 'evidence' and p_decision = 'approved' then
      select claim_id into v_claim from public.evidence where id = v_item.target_id;
      perform private.notify(
        f.user_id, 'new_evidence',
        jsonb_build_object('claim_id', v_claim, 'evidence_id', v_item.target_id)
      )
      from public.follows f
      join public.claims c on c.id = v_claim
      where f.user_id is distinct from v_item.submitted_by
        and (f.claim_id = c.id or f.category = c.category);
    end if;
  end if;

  insert into public.reviews (review_item_id, reviewer_id, target_type, target_id, decision, reason)
  values (v_item.id, v_uid, v_item.target_type, v_item.target_id, p_decision, nullif(btrim(p_reason), ''));

  update public.review_items set decided_at = now() where id = v_item.id;

  if v_item.target_type <> 'report' then
    perform private.notify(
      v_author, 'review_decision',
      jsonb_build_object(
        'target_type', v_item.target_type,
        'target_id', v_item.target_id,
        'decision', p_decision,
        'reason', p_reason
      )
    );
  end if;
end
$$;

create function public.change_claim_status(
  p_claim_id uuid, p_status public.claim_status, p_reason text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_from public.claim_status;
begin
  if not private.is_admin() then
    raise exception 'only admins can change a claim status' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'a reason is required' using errcode = '22023';
  end if;

  select status into v_from from public.claims where id = p_claim_id and deleted_at is null for update;
  if not found then
    raise exception 'claim does not exist' using errcode = 'P0002';
  end if;
  if v_from = p_status then
    raise exception 'the claim already has this status' using errcode = '22023';
  end if;

  update public.claims set status = p_status where id = p_claim_id;
  insert into public.claim_status_changes (claim_id, from_status, to_status, reason, changed_by)
  values (p_claim_id, v_from, p_status, btrim(p_reason), v_uid);
end
$$;

create function public.reorder_evidence(p_claim_id uuid, p_evidence_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_user();
  v_author uuid;
  v_expected uuid[];
begin
  select author_id into v_author from public.claims
  where id = p_claim_id and deleted_at is null for update;
  if not found then
    raise exception 'claim does not exist' using errcode = 'P0002';
  end if;
  if not (private.is_admin() or (private.is_staff() and v_author = v_uid)) then
    raise exception 'only the claim author or an admin can reorder evidence'
      using errcode = '42501';
  end if;

  select coalesce(array_agg(id order by id), '{}') into v_expected
  from public.evidence
  where claim_id = p_claim_id and state = 'published' and deleted_at is null;
  if coalesce((select array_agg(x order by x) from unnest(p_evidence_ids) x), '{}') <> v_expected then
    raise exception 'the list must contain every published evidence item of the claim exactly once'
      using errcode = '22023';
  end if;

  update public.evidence e set sort_order = o.position
  from unnest(p_evidence_ids) with ordinality as o(id, position)
  where e.id = o.id and e.claim_id = p_claim_id and e.state = 'published' and e.deleted_at is null;
end
$$;

create function public.set_user_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_current public.app_role;
begin
  perform private.require_user();
  if not private.is_admin() then
    raise exception 'only admins can change roles' using errcode = '42501';
  end if;

  select role into v_current from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user does not exist' using errcode = 'P0002';
  end if;

  if v_current = 'admin' and p_role <> 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'the last admin cannot be demoted' using errcode = '22023';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
end
$$;

create function public.admin_list_users(
  p_search text default null, p_limit integer default 50, p_offset integer default 0
) returns table (
  id uuid, email text, display_name text, role public.app_role,
  created_at timestamptz, last_sign_in_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_user();
  if not private.is_admin() then
    raise exception 'only admins can list users' using errcode = '42501';
  end if;

  return query
    select p.id, u.email::text, p.display_name, p.role, p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where p_search is null
       or p.display_name ilike '%' || p_search || '%'
       or u.email ilike '%' || p_search || '%'
    order by p.created_at desc, p.id
    limit least(greatest(p_limit, 1), 200)
    offset greatest(p_offset, 0);
end
$$;

create function public.find_duplicate_sources(
  p_url text, p_title text, p_publisher text, p_exclude_id uuid default null
) returns table (id uuid, title text, publisher text, url text, reason text)
language sql stable set search_path = '' as $$
  select s.id, s.title, s.publisher, s.url,
    case when s.normalized_url = private.normalize_url(p_url) then 'same_url' else 'similar_title' end
  from public.sources s
  where s.deleted_at is null
    and s.id is distinct from p_exclude_id
    and (
      s.normalized_url = private.normalize_url(p_url)
      or (
        extensions.similarity(lower(s.title), lower(p_title)) >= 0.8
        and extensions.similarity(lower(s.publisher), lower(p_publisher)) >= 0.6
      )
    )
  order by (s.normalized_url = private.normalize_url(p_url)) desc, s.title
  limit 10
$$;

create function public.get_shared_collection(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'description', c.description,
    'owner', jsonb_build_object('id', p.id, 'display_name', p.display_name),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', i.position,
          'claim', case when cl.id is not null then jsonb_build_object(
            'id', cl.id, 'title', cl.title, 'category', cl.category, 'status', cl.status) end,
          'source', case when so.id is not null then jsonb_build_object(
            'id', so.id, 'title', so.title, 'publisher', so.publisher) end
        ) order by i.position, i.id
      )
      from public.collection_items i
      left join public.claims cl on cl.id = i.claim_id
        and cl.state = 'published' and cl.deleted_at is null
      left join public.sources so on so.id = i.source_id
        and so.state = 'published' and so.deleted_at is null
      where i.collection_id = c.id and (cl.id is not null or so.id is not null)
    ), '[]'::jsonb)
  )
  from public.collections c
  join public.profiles p on p.id = c.owner_id
  where c.share_token = p_token and c.visibility in ('public', 'unlisted')
$$;
