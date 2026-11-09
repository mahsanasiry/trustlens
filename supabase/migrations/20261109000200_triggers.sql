create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_locale text;
begin
  v_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    ),
    80
  );
  v_locale := coalesce(new.raw_user_meta_data ->> 'locale', 'en');
  if v_locale !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$' then
    v_locale := 'en';
  end if;

  insert into public.profiles (id, display_name) values (new.id, v_name);
  insert into public.user_settings (user_id, locale) values (new.id, v_locale);
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Strips workflow bookkeeping from a row so that only the content itself is
-- compared and versioned. A claim's editorial status has its own history table,
-- so it never counts as an edit; an assessment's status is its content.
create function private.content_of(p_row jsonb, p_table text) returns jsonb
language sql immutable parallel safe as $$
  select p_row - array[
    'search_vector', 'normalized_url', 'updated_at', 'created_at', 'version', 'sort_order',
    'state', 'released_at', 'deleted_at', 'deleted_by', 'is_demo', 'author_id'
  ] - case when p_table = 'claims' then array['status'] else array[]::text[] end
$$;

create function private.entity_label(p_table text) returns public.content_entity
language sql immutable parallel safe as $$
  select case p_table
    when 'claims' then 'claim'
    when 'sources' then 'source'
    when 'evidence' then 'evidence'
    else 'assessment'
  end::public.content_entity
$$;

create function private.guard_content_update() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_key text;
  v_protected text[] := array[
    'author_id', 'version', 'released_at', 'state', 'deleted_by', 'is_demo', 'created_at'
  ];
begin
  -- Workflow functions run as the table owner, and the service role is used only
  -- by trusted server code. Direct client writes are the ones restricted here.
  if current_user not in ('authenticated', 'anon') or private.is_admin() then
    return new;
  end if;

  if tg_table_name = 'claims' then
    v_protected := array_append(v_protected, 'status');
  end if;

  foreach v_key in array v_protected loop
    if v_old -> v_key is distinct from v_new -> v_key then
      raise exception 'column "%" cannot be changed directly', v_key using errcode = '42501';
    end if;
  end loop;
  return new;
end
$$;

create function private.increment_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.state = 'published' and new.state = 'published'
     and private.content_of(to_jsonb(old), tg_table_name)
         is distinct from private.content_of(to_jsonb(new), tg_table_name) then
    new.version := old.version + 1;
  end if;
  return new;
end
$$;

create function private.stamp_release() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.state = 'published' and new.released_at is null then
    new.released_at := now();
  end if;
  if new.deleted_at is not null and new.deleted_by is null
     and (tg_op = 'INSERT' or old.deleted_at is null) then
    new.deleted_by := auth.uid();
  end if;
  return new;
end
$$;

create function private.record_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.state <> 'published' then
    return null;
  end if;
  if tg_op = 'UPDATE' and old.state = 'published' and new.version = old.version then
    return null;
  end if;

  insert into public.entity_versions (entity_type, entity_id, version, data, change_summary, changed_by)
  values (
    private.entity_label(tg_table_name),
    new.id,
    new.version,
    private.content_of(to_jsonb(new), tg_table_name),
    nullif(current_setting('private.change_summary', true), ''),
    auth.uid()
  )
  on conflict (entity_type, entity_id, version) do nothing;
  return null;
end
$$;

create function private.write_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_before := to_jsonb(old) - 'search_vector';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_after := to_jsonb(new) - 'search_vector';
  end if;
  if tg_op = 'UPDATE' and (v_before - 'updated_at') = (v_after - 'updated_at') then
    return null;
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (coalesce(v_after, v_before) ->> 'id')::uuid,
    v_before,
    v_after
  );
  return null;
end
$$;

create function private.notify(p_user uuid, p_type public.notification_type, p_payload jsonb)
returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, payload)
  select p_user, p_type, p_payload
  where p_user is not null
    and not exists (
      select 1 from public.user_settings s
      where s.user_id = p_user
        and s.notification_preferences -> (p_type::text) = 'false'::jsonb
    )
$$;

create function private.limit_report_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (
    select count(*) from public.reports r
    where r.user_id = new.user_id and r.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'too many reports in the last 24 hours' using errcode = '53400';
  end if;
  return new;
end
$$;

create function private.enqueue_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.review_items (target_type, target_id, submitted_by)
  values ('report', new.id, new.user_id);
  return null;
end
$$;

create function private.notify_collection_share() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_collection public.collections;
begin
  select * into v_collection from public.collections where id = new.collection_id;
  perform private.notify(
    new.user_id,
    'collection_shared',
    jsonb_build_object(
      'collection_id', v_collection.id,
      'title', v_collection.title,
      'shared_by', v_collection.owner_id
    )
  );
  return null;
end
$$;

create unique index reports_open_duplicate_idx
  on public.reports (user_id, kind, target_type, target_id)
  where status in ('open', 'in_review');

create trigger touch_updated_at before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.user_settings
  for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.collections
  for each row execute function private.touch_updated_at();

create trigger guard_content_update before update on public.claims
  for each row execute function private.guard_content_update();
create trigger guard_content_update before update on public.sources
  for each row execute function private.guard_content_update();
create trigger guard_content_update before update on public.evidence
  for each row execute function private.guard_content_update();
create trigger guard_content_update before update on public.source_assessments
  for each row execute function private.guard_content_update();

create trigger increment_version before update on public.claims
  for each row execute function private.increment_version();
create trigger increment_version before update on public.sources
  for each row execute function private.increment_version();
create trigger increment_version before update on public.evidence
  for each row execute function private.increment_version();
create trigger increment_version before update on public.source_assessments
  for each row execute function private.increment_version();

create trigger stamp_release before insert or update on public.claims
  for each row execute function private.stamp_release();
create trigger stamp_release before insert or update on public.sources
  for each row execute function private.stamp_release();
create trigger stamp_release before insert or update on public.evidence
  for each row execute function private.stamp_release();
create trigger stamp_release before insert or update on public.source_assessments
  for each row execute function private.stamp_release();

create trigger touch_updated_at before update on public.claims
  for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.sources
  for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.evidence
  for each row execute function private.touch_updated_at();
create trigger touch_updated_at before update on public.source_assessments
  for each row execute function private.touch_updated_at();

create trigger record_version after insert or update on public.claims
  for each row execute function private.record_version();
create trigger record_version after insert or update on public.sources
  for each row execute function private.record_version();
create trigger record_version after insert or update on public.evidence
  for each row execute function private.record_version();
create trigger record_version after insert or update on public.source_assessments
  for each row execute function private.record_version();

create trigger write_audit after insert or update or delete on public.claims
  for each row execute function private.write_audit();
create trigger write_audit after insert or update or delete on public.sources
  for each row execute function private.write_audit();
create trigger write_audit after insert or update or delete on public.evidence
  for each row execute function private.write_audit();
create trigger write_audit after insert or update or delete on public.source_assessments
  for each row execute function private.write_audit();
create trigger write_audit after insert or update or delete on public.profiles
  for each row execute function private.write_audit();
create trigger write_audit after insert or update on public.reports
  for each row execute function private.write_audit();
create trigger write_audit after insert on public.reviews
  for each row execute function private.write_audit();
create trigger write_audit after insert on public.claim_status_changes
  for each row execute function private.write_audit();
create trigger write_audit after insert or update on public.content_revisions
  for each row execute function private.write_audit();

create trigger limit_report_rate before insert on public.reports
  for each row execute function private.limit_report_rate();
create trigger enqueue_report after insert on public.reports
  for each row execute function private.enqueue_report();
create trigger notify_collection_share after insert on public.collection_shares
  for each row execute function private.notify_collection_share();
