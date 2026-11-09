grant usage on schema private to anon, authenticated, service_role;
grant usage on schema extensions to authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on
  public.claims, public.sources, public.evidence, public.source_assessments,
  public.claim_relations, public.claim_status_changes, public.entity_versions,
  public.collections, public.collection_items, public.profiles
to anon;

grant select on
  public.profiles, public.user_settings, public.claims, public.claim_relations,
  public.claim_status_changes, public.sources, public.evidence, public.source_assessments,
  public.content_revisions, public.entity_versions, public.review_items, public.reviews,
  public.reports, public.audit_logs, public.collections, public.collection_shares,
  public.collection_items, public.bookmarks, public.follows, public.saved_views,
  public.notifications
to authenticated;

grant insert on
  public.claims, public.sources, public.evidence, public.source_assessments,
  public.claim_relations, public.reports, public.collections, public.collection_shares,
  public.collection_items, public.bookmarks, public.follows, public.saved_views
to authenticated;

grant update on
  public.claims, public.sources, public.evidence, public.source_assessments,
  public.collections, public.collection_items, public.saved_views
to authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;
grant update (locale, time_zone, notification_preferences) on public.user_settings to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant delete on
  public.claim_relations, public.collections, public.collection_shares,
  public.collection_items, public.bookmarks, public.follows, public.saved_views,
  public.notifications
to authenticated;

grant execute on function
  public.submit_for_review(public.content_entity, uuid),
  public.propose_revision(public.content_entity, uuid, jsonb, text),
  public.claim_review_item(uuid),
  public.release_review_item(uuid),
  public.decide_review(uuid, public.review_decision, text),
  public.change_claim_status(uuid, public.claim_status, text),
  public.reorder_evidence(uuid, uuid[]),
  public.set_user_role(uuid, public.app_role),
  public.admin_list_users(text, integer, integer),
  public.find_duplicate_sources(text, text, text, uuid)
to authenticated;

grant execute on function public.get_shared_collection(uuid) to anon, authenticated;
