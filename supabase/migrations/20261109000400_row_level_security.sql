create function private.owns_collection(p_collection_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.collections c
    where c.id = p_collection_id and c.owner_id = auth.uid()
  )
$$;

-- Anonymous visitors have no privileges on collection_shares, so the collection
-- policy cannot query it directly.
create function private.is_shared_with_me(p_collection_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.collection_shares s
    where s.collection_id = p_collection_id and s.user_id = auth.uid()
  )
$$;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.claims enable row level security;
alter table public.claim_relations enable row level security;
alter table public.claim_status_changes enable row level security;
alter table public.sources enable row level security;
alter table public.evidence enable row level security;
alter table public.source_assessments enable row level security;
alter table public.content_revisions enable row level security;
alter table public.entity_versions enable row level security;
alter table public.review_items enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.collections enable row level security;
alter table public.collection_shares enable row level security;
alter table public.collection_items enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;
alter table public.saved_views enable row level security;
alter table public.notifications enable row level security;

create policy profiles_read_signed_in on public.profiles
  for select to authenticated using (true);
create policy profiles_read_published_authors on public.profiles
  for select to anon using (
    exists (
      select 1 from public.claims c
      where c.author_id = profiles.id and c.state = 'published' and c.deleted_at is null
    ) or exists (
      select 1 from public.sources s
      where s.author_id = profiles.id and s.state = 'published' and s.deleted_at is null
    )
  );
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy user_settings_read_own on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy claims_read on public.claims
  for select to anon, authenticated using (
    (state = 'published' and deleted_at is null)
    or author_id = (select auth.uid())
    or private.is_admin()
  );
create policy claims_insert_own_draft on public.claims
  for insert to authenticated with check (
    private.is_staff()
    and author_id = (select auth.uid())
    and state = 'draft' and status = 'unreviewed' and version = 1
    and released_at is null and deleted_at is null and deleted_by is null and not is_demo
  );
create policy claims_update_own_draft on public.claims
  for update to authenticated
  using (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
  )
  with check (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
  );
create policy claims_admin_all on public.claims
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy sources_read on public.sources
  for select to anon, authenticated using (
    (state = 'published' and deleted_at is null)
    or author_id = (select auth.uid())
    or private.is_admin()
  );
create policy sources_insert_own_draft on public.sources
  for insert to authenticated with check (
    private.is_staff()
    and author_id = (select auth.uid())
    and state = 'draft' and version = 1
    and released_at is null and deleted_at is null and deleted_by is null and not is_demo
  );
create policy sources_update_own_draft on public.sources
  for update to authenticated
  using (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
  )
  with check (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
  );
create policy sources_admin_all on public.sources
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy evidence_read on public.evidence
  for select to anon, authenticated using (
    (
      state = 'published' and deleted_at is null
      and exists (select 1 from public.claims c where c.id = evidence.claim_id)
      and exists (select 1 from public.sources s where s.id = evidence.source_id)
    )
    or author_id = (select auth.uid())
    or private.is_admin()
  );
create policy evidence_insert_own_draft on public.evidence
  for insert to authenticated with check (
    private.is_staff()
    and author_id = (select auth.uid())
    and state = 'draft' and version = 1
    and released_at is null and deleted_at is null and deleted_by is null and not is_demo
    and exists (select 1 from public.claims c where c.id = claim_id)
    and exists (select 1 from public.sources s where s.id = source_id)
  );
create policy evidence_update_own_draft on public.evidence
  for update to authenticated
  using (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
  )
  with check (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
    and exists (select 1 from public.claims c where c.id = claim_id)
    and exists (select 1 from public.sources s where s.id = source_id)
  );
create policy evidence_admin_all on public.evidence
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy assessments_read on public.source_assessments
  for select to anon, authenticated using (
    (
      state = 'published' and deleted_at is null
      and exists (select 1 from public.sources s where s.id = source_assessments.source_id)
    )
    or author_id = (select auth.uid())
    or private.is_admin()
  );
create policy assessments_insert_own_draft on public.source_assessments
  for insert to authenticated with check (
    private.is_staff()
    and author_id = (select auth.uid())
    and state = 'draft' and version = 1
    and released_at is null and deleted_at is null and deleted_by is null and not is_demo
    and exists (select 1 from public.sources s where s.id = source_id)
  );
create policy assessments_update_own_draft on public.source_assessments
  for update to authenticated
  using (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
  )
  with check (
    private.is_staff() and author_id = (select auth.uid())
    and state in ('draft', 'changes_requested')
    and exists (select 1 from public.sources s where s.id = source_id)
  );
create policy assessments_admin_all on public.source_assessments
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy claim_relations_read on public.claim_relations
  for select to anon, authenticated using (
    exists (select 1 from public.claims c where c.id = claim_relations.claim_id)
    and exists (select 1 from public.claims r where r.id = claim_relations.related_claim_id)
  );
create policy claim_relations_insert_own_draft on public.claim_relations
  for insert to authenticated with check (
    private.is_staff()
    and created_by = (select auth.uid())
    and exists (
      select 1 from public.claims c
      where c.id = claim_id and c.author_id = (select auth.uid())
        and c.state in ('draft', 'changes_requested')
    )
    and exists (select 1 from public.claims r where r.id = related_claim_id)
  );
create policy claim_relations_delete_own_draft on public.claim_relations
  for delete to authenticated using (
    private.is_staff()
    and exists (
      select 1 from public.claims c
      where c.id = claim_id and c.author_id = (select auth.uid())
        and c.state in ('draft', 'changes_requested')
    )
  );
create policy claim_relations_admin_all on public.claim_relations
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy claim_status_changes_read on public.claim_status_changes
  for select to anon, authenticated using (
    exists (select 1 from public.claims c where c.id = claim_status_changes.claim_id)
  );

create policy content_revisions_read on public.content_revisions
  for select to authenticated using (
    author_id = (select auth.uid()) or private.is_admin()
  );

create policy entity_versions_read on public.entity_versions
  for select to anon, authenticated using (
    case entity_type
      when 'claim' then exists (select 1 from public.claims c where c.id = entity_versions.entity_id)
      when 'source' then exists (select 1 from public.sources s where s.id = entity_versions.entity_id)
      when 'evidence' then exists (select 1 from public.evidence e where e.id = entity_versions.entity_id)
      else exists (select 1 from public.source_assessments a where a.id = entity_versions.entity_id)
    end
  );

create policy review_items_read on public.review_items
  for select to authenticated using (
    submitted_by = (select auth.uid()) or private.is_admin()
  );

create policy reviews_read on public.reviews
  for select to authenticated using (
    private.is_admin()
    or exists (
      select 1 from public.review_items i
      where i.id = reviews.review_item_id and i.submitted_by = (select auth.uid())
    )
  );

create policy reports_read on public.reports
  for select to authenticated using (
    user_id = (select auth.uid()) or private.is_admin()
  );
create policy reports_insert_own on public.reports
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and status = 'open' and resolved_at is null
    and case target_type
      when 'claim' then exists (select 1 from public.claims c where c.id = target_id)
      when 'source' then exists (select 1 from public.sources s where s.id = target_id)
      else exists (select 1 from public.evidence e where e.id = target_id)
    end
  );

create policy audit_logs_read on public.audit_logs
  for select to authenticated using (private.is_admin());

create policy collections_read on public.collections
  for select to anon, authenticated using (
    visibility = 'public'
    or owner_id = (select auth.uid())
    or private.is_shared_with_me(id)
  );
create policy collections_insert_own on public.collections
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy collections_update_own on public.collections
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy collections_delete_own on public.collections
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy collection_shares_read on public.collection_shares
  for select to authenticated using (
    user_id = (select auth.uid()) or private.owns_collection(collection_id)
  );
create policy collection_shares_insert_owner on public.collection_shares
  for insert to authenticated with check (private.owns_collection(collection_id));
create policy collection_shares_delete_owner on public.collection_shares
  for delete to authenticated using (private.owns_collection(collection_id));

create policy collection_items_read on public.collection_items
  for select to anon, authenticated using (
    exists (select 1 from public.collections c where c.id = collection_items.collection_id)
    and (claim_id is null or exists (select 1 from public.claims c where c.id = collection_items.claim_id))
    and (source_id is null or exists (select 1 from public.sources s where s.id = collection_items.source_id))
  );
create policy collection_items_insert_owner on public.collection_items
  for insert to authenticated with check (
    private.owns_collection(collection_id)
    and (claim_id is null or exists (select 1 from public.claims c where c.id = claim_id))
    and (source_id is null or exists (select 1 from public.sources s where s.id = source_id))
  );
create policy collection_items_update_owner on public.collection_items
  for update to authenticated
  using (private.owns_collection(collection_id))
  with check (private.owns_collection(collection_id));
create policy collection_items_delete_owner on public.collection_items
  for delete to authenticated using (private.owns_collection(collection_id));

create policy bookmarks_read_own on public.bookmarks
  for select to authenticated using (user_id = (select auth.uid()));
create policy bookmarks_insert_own on public.bookmarks
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (claim_id is null or exists (select 1 from public.claims c where c.id = claim_id))
    and (source_id is null or exists (select 1 from public.sources s where s.id = source_id))
  );
create policy bookmarks_delete_own on public.bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));

create policy follows_read_own on public.follows
  for select to authenticated using (user_id = (select auth.uid()));
create policy follows_insert_own on public.follows
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (claim_id is null or exists (select 1 from public.claims c where c.id = claim_id))
  );
create policy follows_delete_own on public.follows
  for delete to authenticated using (user_id = (select auth.uid()));

create policy saved_views_read_own on public.saved_views
  for select to authenticated using (user_id = (select auth.uid()));
create policy saved_views_insert_own on public.saved_views
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy saved_views_update_own on public.saved_views
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy saved_views_delete_own on public.saved_views
  for delete to authenticated using (user_id = (select auth.uid()));

create policy notifications_read_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));
