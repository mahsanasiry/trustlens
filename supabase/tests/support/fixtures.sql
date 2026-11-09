insert into auth.users (id, email, raw_user_meta_data)
select tests.id(n), n || '@example.test', jsonb_build_object('name', initcap(n))
from unnest(array['alice', 'bob', 'rita', 'rob', 'ada', 'ada2']) as n;

update public.profiles set role = 'researcher' where id in (tests.id('rita'), tests.id('rob'));
update public.profiles set role = 'admin' where id in (tests.id('ada'), tests.id('ada2'));

insert into public.sources (id, title, publisher, url, authors, type, state, author_id) values
  (tests.id('s1'), 'Regional Energy Outlook', 'Harbor Institute', 'https://example.test/energy?utm_source=x', '{"A. Rowan"}', 'report', 'published', tests.id('rita')),
  (tests.id('s2'), 'Water Quality Survey', 'Lakeside Statistics Office', 'https://example.test/water', '{}', 'dataset', 'published', tests.id('rita')),
  (tests.id('s3'), 'Unreleased Dataset', 'Harbor Institute', 'https://example.test/unreleased', '{}', 'dataset', 'draft', tests.id('rita'));

insert into public.claims (id, title, category, status, origin, keywords, state, author_id) values
  (tests.id('c1'), 'Solar capacity doubled in the region', 'environment', 'evidence_available', 'Regional newsletter', '{solar,energy}', 'published', tests.id('rita')),
  (tests.id('c2'), 'Draft claim by Rita', 'technology', 'unreviewed', '', '{}', 'draft', tests.id('rita')),
  (tests.id('c3'), 'Draft claim by Rob', 'education', 'unreviewed', '', '{}', 'draft', tests.id('rob')),
  (tests.id('c4'), 'Published claim by Rob', 'science', 'unreviewed', '', '{}', 'published', tests.id('rob')),
  (tests.id('c5'), 'Retracted wording', 'science', 'archived', '', '{}', 'published', tests.id('rob'));
update public.claims set deleted_at = now() where id = tests.id('c5');

insert into public.evidence (id, claim_id, source_id, title, summary, position, state, author_id) values
  (tests.id('e1'), tests.id('c1'), tests.id('s1'), 'Capacity table', 'Table of installed capacity.', 'supports', 'published', tests.id('rita')),
  (tests.id('e2'), tests.id('c1'), tests.id('s3'), 'Hidden dataset finding', 'Relies on an unpublished source.', 'contradicts', 'published', tests.id('rita')),
  (tests.id('e3'), tests.id('c1'), tests.id('s1'), 'Draft evidence', 'Not yet reviewed.', 'context', 'draft', tests.id('rita'));

insert into public.source_assessments (id, source_id, criterion, status, state, author_id) values
  (tests.id('a1'), tests.id('s1'), 'author_transparency', 'verified', 'published', tests.id('rita')),
  (tests.id('a2'), tests.id('s1'), 'publisher_transparency', 'partially_verified', 'draft', tests.id('rita'));

insert into public.collections (id, owner_id, title, visibility, share_token) values
  (tests.id('k-private'), tests.id('alice'), 'Alice private', 'private', tests.id('token-private')),
  (tests.id('k-public'), tests.id('alice'), 'Alice public', 'public', tests.id('token-public')),
  (tests.id('k-unlisted'), tests.id('alice'), 'Alice unlisted', 'unlisted', tests.id('token-unlisted')),
  (tests.id('k-bob'), tests.id('bob'), 'Bob private', 'private', tests.id('token-bob'));

insert into public.collection_items (collection_id, claim_id, source_id, position) values
  (tests.id('k-public'), tests.id('c1'), null, 1),
  (tests.id('k-public'), tests.id('c2'), null, 2),
  (tests.id('k-public'), null, tests.id('s1'), 3),
  (tests.id('k-unlisted'), tests.id('c1'), null, 1);

insert into public.collection_shares (collection_id, user_id)
values (tests.id('k-bob'), tests.id('alice'));

insert into public.bookmarks (user_id, claim_id) values (tests.id('alice'), tests.id('c1'));
insert into public.bookmarks (user_id, source_id) values (tests.id('bob'), tests.id('s1'));
insert into public.follows (user_id, claim_id) values (tests.id('bob'), tests.id('c1'));
insert into public.follows (user_id, category) values (tests.id('alice'), 'environment');
insert into public.saved_views (user_id, name, query) values (tests.id('alice'), 'My filter', '{"q":"solar"}');
insert into public.notifications (user_id, type) values
  (tests.id('alice'), 'new_evidence'), (tests.id('bob'), 'new_evidence');
