create schema if not exists private;
create extension if not exists pg_trgm with schema extensions;

create type public.app_role as enum ('user', 'researcher', 'admin');
create type public.content_state as enum (
  'draft', 'pending_review', 'changes_requested', 'published', 'rejected'
);
create type public.claim_status as enum (
  'unreviewed', 'under_review', 'evidence_available', 'conflicting_evidence',
  'insufficient_evidence', 'archived'
);
create type public.claim_category as enum (
  'science', 'education', 'environment', 'technology', 'social_issues', 'public_policy'
);
create type public.evidence_position as enum ('supports', 'contradicts', 'context');
create type public.source_type as enum (
  'journal_article', 'report', 'dataset', 'news_article', 'government_document',
  'press_release', 'book', 'website', 'preprint', 'other'
);
create type public.assessment_criterion as enum (
  'author_transparency', 'publisher_transparency', 'citations_present', 'publication_date',
  'data_collection_method', 'independent_verifiability', 'conflict_of_interest',
  'corrections_history'
);
create type public.criterion_status as enum (
  'verified', 'partially_verified', 'not_verified', 'not_applicable'
);
create type public.collection_visibility as enum ('private', 'public', 'unlisted');
create type public.content_entity as enum ('claim', 'source', 'evidence', 'assessment');
create type public.review_target as enum (
  'claim', 'source', 'evidence', 'assessment', 'revision', 'report'
);
create type public.review_decision as enum ('approved', 'rejected', 'changes_requested');
create type public.report_kind as enum (
  'broken_source', 'incorrect_information', 'suggest_source', 'add_contradicting_evidence',
  'request_correction'
);
create type public.report_status as enum ('open', 'in_review', 'resolved', 'dismissed');
create type public.notification_type as enum (
  'report_status_changed', 'review_decision', 'new_evidence', 'collection_shared',
  'correction_published'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  avatar_path text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  locale text not null default 'en' check (locale ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
  notification_preferences jsonb not null default '{}'::jsonb
    check (jsonb_typeof(notification_preferences) = 'object'),
  updated_at timestamptz not null default now()
);

create function private.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_app_role() = 'admin', false)
$$;

create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_app_role() in ('researcher', 'admin'), false)
$$;

-- array_to_string is only stable, which generated columns reject. For text[] the
-- result never depends on session settings, so an immutable wrapper is safe.
create function private.join_words(p_words text[]) returns text
language sql immutable parallel safe as $$
  select coalesce(array_to_string(p_words, ' '), '')
$$;

-- Used to detect duplicate sources, not to resolve addresses: it lowercases, drops
-- the scheme, "www.", fragments and common tracking parameters, and trailing slashes.
create function private.normalize_url(p_url text) returns text
language sql immutable parallel safe as $$
  select regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(lower(btrim(p_url)), '^https?://(www\.)?', ''),
            '#.*$', ''),
          '[?&](utm_[a-z_]+|fbclid|gclid|mc_cid|mc_eid)=[^&]*', '', 'g'),
        '^([^?&]*)&', '\1?'),
      '[?&]+$', ''),
    '/+(\?|$)', '\1')
$$;

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 300),
  description text not null default '' check (char_length(description) <= 5000),
  category public.claim_category not null,
  status public.claim_status not null default 'unreviewed',
  origin text not null default '' check (char_length(origin) <= 1000),
  origin_url text check (origin_url is null or (origin_url ~* '^https?://[^\s]+$' and char_length(origin_url) <= 2048)),
  first_appeared_on date,
  keywords text[] not null default '{}' check (cardinality(keywords) <= 20),
  language text not null default 'en' check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  state public.content_state not null default 'draft',
  author_id uuid references public.profiles (id) on delete set null,
  version integer not null default 1 check (version >= 1),
  released_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', private.join_words(keywords)), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(origin, '')), 'C')
  ) stored,
  check ((state = 'published') = (released_at is not null))
);

create index claims_search_vector_idx on public.claims using gin (search_vector);
create index claims_title_trgm_idx on public.claims using gin (title extensions.gin_trgm_ops);
create index claims_listing_idx on public.claims (category, status, released_at desc)
  where state = 'published' and deleted_at is null;
create index claims_author_idx on public.claims (author_id);

create table public.claim_relations (
  claim_id uuid not null references public.claims (id) on delete cascade,
  related_claim_id uuid not null references public.claims (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (claim_id, related_claim_id),
  check (claim_id <> related_claim_id)
);
create unique index claim_relations_pair_idx on public.claim_relations (
  least(claim_id, related_claim_id), greatest(claim_id, related_claim_id)
);
create index claim_relations_related_idx on public.claim_relations (related_claim_id);

create table public.claim_status_changes (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  from_status public.claim_status not null,
  to_status public.claim_status not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (from_status <> to_status)
);
create index claim_status_changes_claim_idx on public.claim_status_changes (claim_id, created_at);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 3 and 400),
  publisher text not null check (char_length(btrim(publisher)) between 1 and 200),
  url text not null check (url ~* '^https?://[^\s]+$' and char_length(url) <= 2048),
  normalized_url text generated always as (private.normalize_url(url)) stored,
  authors text[] not null default '{}' check (cardinality(authors) <= 30),
  published_on date,
  accessed_on date,
  type public.source_type not null default 'other',
  language text not null default 'en' check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  state public.content_state not null default 'draft',
  author_id uuid references public.profiles (id) on delete set null,
  version integer not null default 1 check (version >= 1),
  released_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(publisher, '')), 'B') ||
    setweight(to_tsvector('simple', private.join_words(authors)), 'B')
  ) stored,
  check ((state = 'published') = (released_at is not null)),
  check (accessed_on is null or published_on is null or accessed_on >= published_on)
);

create index sources_search_vector_idx on public.sources using gin (search_vector);
create index sources_title_trgm_idx on public.sources using gin (title extensions.gin_trgm_ops);
create index sources_publisher_trgm_idx on public.sources using gin (publisher extensions.gin_trgm_ops);
create index sources_normalized_url_idx on public.sources (normalized_url);
create index sources_author_idx on public.sources (author_id);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 300),
  summary text not null check (char_length(btrim(summary)) between 1 and 5000),
  position public.evidence_position not null,
  limitations text not null default '' check (char_length(limitations) <= 3000),
  researcher_note text not null default '' check (char_length(researcher_note) <= 3000),
  sort_order integer not null default 0,
  state public.content_state not null default 'draft',
  author_id uuid references public.profiles (id) on delete set null,
  version integer not null default 1 check (version >= 1),
  released_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((state = 'published') = (released_at is not null))
);

create index evidence_claim_idx on public.evidence (claim_id, sort_order);
create index evidence_source_idx on public.evidence (source_id);
create index evidence_author_idx on public.evidence (author_id);

create table public.source_assessments (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  criterion public.assessment_criterion not null,
  status public.criterion_status not null default 'not_verified',
  notes text not null default '' check (char_length(notes) <= 3000),
  state public.content_state not null default 'draft',
  author_id uuid references public.profiles (id) on delete set null,
  version integer not null default 1 check (version >= 1),
  released_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, criterion),
  check ((state = 'published') = (released_at is not null))
);

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type public.content_entity not null,
  entity_id uuid not null,
  base_version integer not null check (base_version >= 1),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload <> '{}'::jsonb),
  change_summary text not null check (char_length(btrim(change_summary)) between 3 and 500),
  state public.content_state not null default 'pending_review'
    check (state in ('pending_review', 'changes_requested', 'published', 'rejected')),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index content_revisions_entity_idx on public.content_revisions (entity_type, entity_id);

create table public.entity_versions (
  id bigint generated always as identity primary key,
  entity_type public.content_entity not null,
  entity_id uuid not null,
  version integer not null,
  data jsonb not null,
  change_summary text,
  changed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id, version)
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  target_type public.review_target not null,
  target_id uuid not null,
  submitted_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz not null default now(),
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  decided_at timestamptz,
  check ((claimed_by is null) = (claimed_at is null))
);
create unique index review_items_open_target_idx on public.review_items (target_type, target_id)
  where decided_at is null;
create index review_items_queue_idx on public.review_items (submitted_at) where decided_at is null;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  review_item_id uuid not null references public.review_items (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  target_type public.review_target not null,
  target_id uuid not null,
  decision public.review_decision not null,
  reason text,
  created_at timestamptz not null default now(),
  check (decision = 'approved' or char_length(btrim(coalesce(reason, ''))) >= 3)
);
create index reviews_item_idx on public.reviews (review_item_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind public.report_kind not null,
  target_type public.content_entity not null check (target_type in ('claim', 'source', 'evidence')),
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 2000),
  suggested_url text check (suggested_url is null or (suggested_url ~* '^https?://[^\s]+$' and char_length(suggested_url) <= 2048)),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_user_idx on public.reports (user_id, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  visibility public.collection_visibility not null default 'private',
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index collections_owner_idx on public.collections (owner_id);
create index collections_public_idx on public.collections (created_at desc)
  where visibility = 'public';

create table public.collection_shares (
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);
create index collection_shares_user_idx on public.collection_shares (user_id);

create table public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete cascade,
  source_id uuid references public.sources (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(claim_id, source_id) = 1),
  unique (collection_id, claim_id),
  unique (collection_id, source_id)
);
create index collection_items_order_idx on public.collection_items (collection_id, position);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete cascade,
  source_id uuid references public.sources (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(claim_id, source_id) = 1),
  unique (user_id, claim_id),
  unique (user_id, source_id)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  claim_id uuid references public.claims (id) on delete cascade,
  category public.claim_category,
  created_at timestamptz not null default now(),
  check (num_nonnulls(claim_id, category) = 1),
  unique (user_id, claim_id),
  unique (user_id, category)
);

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  query jsonb not null check (jsonb_typeof(query) = 'object'),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
