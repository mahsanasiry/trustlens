insert into public.claims (id, title, category, status, state, author_id)
values (tests.id('c-cjk'), '水质调查报告', 'environment', 'unreviewed', 'published', tests.id('rita'));

select tests.as_anon();

select tests.eq((select count(*) from public.search_content('solar'))::int, 1, 'a keyword finds the claim it belongs to');
select tests.eq((select id from public.search_content('solar')), tests.id('c1'), 'the keyword match is the right claim');
select tests.eq((select count(*) from public.search_content('energy'))::int, 2, 'one word can match a claim keyword and a source title');
select tests.eq((select count(*) from public.search_content('energy', 'claim'))::int, 1, 'the kind filter limits results to claims');
select tests.eq((select count(*) from public.search_content('energy', 'source'))::int, 1, 'the kind filter limits results to sources');
select tests.eq((select count(*) from public.search_content('ENERGY'))::int, 2, 'matching ignores case');
select tests.eq((select count(*) from public.search_content('Regio'))::int, 2, 'a partial word matches by substring');
select tests.eq((select id from public.search_content('Lakeside')), tests.id('s2'), 'a publisher name finds its source');
select tests.eq((select count(*) from public.search_content('Unreleased'))::int, 0, 'draft sources are not searchable');
select tests.eq((select count(*) from public.search_content('Draft claim'))::int, 0, 'draft claims are not searchable');
select tests.eq((select count(*) from public.search_content('Retracted'))::int, 0, 'deleted claims are not searchable');
select tests.eq((select count(*) from public.search_content('Harbor'))::int, 1, 'a publisher match skips the draft source');

select tests.eq((select count(*) from public.search_content('a'))::int, 0, 'a single Latin letter is too short to search');
select tests.eq((select count(*) from public.search_content('   '))::int, 0, 'blank queries return nothing');
select tests.eq((select count(*) from public.search_content(null))::int, 0, 'a missing query returns nothing');
select tests.eq((select count(*) from public.search_content('水'))::int, 1, 'a single CJK character is enough to search');
select tests.eq((select count(*) from public.search_content('质调'))::int, 1, 'text without spaces matches inside the title');

select tests.eq((select count(*) from public.search_content('%%'))::int, 0, 'LIKE wildcards are matched literally');
select tests.eq((select count(*) from public.search_content('__'))::int, 0, 'underscores are matched literally');
select tests.ok((select count(*) from public.search_content($$a & | ( )! :* ' \$$)) >= 0, 'operator characters do not break the query');

select tests.eq((select count(*) from public.search_content('Regio', 'all', 1, 0))::int, 1, 'the limit caps the rows returned');
select tests.eq((select total_count from public.search_content('Regio', 'all', 1, 0)), 2::bigint, 'the total counts all matches, not just the page');
select tests.eq((select count(*) from public.search_content('Regio', 'all', 1, 1))::int, 1, 'the offset moves to the next page');
select tests.eq((select count(*) from public.search_content('Regio', 'all', 1, 5))::int, 0, 'an offset past the end returns nothing');
select tests.ok(
  (select min(id::text) from public.search_content('Regio', 'all', 1, 0))
    is distinct from (select min(id::text) from public.search_content('Regio', 'all', 1, 1)),
  'consecutive pages do not repeat a result'
);
select tests.reset();

select tests.as_user('alice');
select tests.eq((select count(*) from public.search_content('energy'))::int, 2, 'signed-in users get the same results as visitors');
select tests.eq((select count(*) from public.search_content('Unreleased'))::int, 0, 'signed-in users cannot search drafts either');
select tests.reset();

select tests.as_user('rita');
select tests.eq((select count(*) from public.search_content('Unreleased'))::int, 0, 'researchers searching publicly do not see their own drafts');
select tests.reset();
