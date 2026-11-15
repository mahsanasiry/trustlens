-- Alice already has a bookmark on the published claim c1 (see fixtures).
insert into public.bookmarks (user_id, source_id, created_at)
values (tests.id('alice'), tests.id('s2'), now() + interval '1 minute');

select tests.as_user('alice');
select tests.eq((select count(*) from public.list_bookmarks())::int, 2, 'a reader lists their own saved items');
select tests.eq((select id from public.list_bookmarks() limit 1), tests.id('s2'), 'the newest bookmark comes first');
select tests.eq((select kind from public.list_bookmarks() offset 1 limit 1), 'claim', 'a claim bookmark is reported as a claim');
select tests.eq((select total_count from public.list_bookmarks(1, 0)), 2::bigint, 'the total counts every saved item, not only the page');
select tests.eq((select count(*) from public.list_bookmarks(1, 1))::int, 1, 'the offset moves to the next page');
select tests.eq((select count(*) from public.list_bookmarks(1, 5))::int, 0, 'an offset past the end returns nothing');
select tests.throws($$insert into public.bookmarks (user_id, claim_id) values (tests.id('alice'), tests.id('c1'))$$, '23505', 'saving the same claim twice is rejected by the database');
select tests.eq(tests.affected($$delete from public.bookmarks where user_id = tests.id('alice') and claim_id = tests.id('c1')$$), 1, 'a reader can remove their own bookmark');
select tests.eq((select count(*) from public.list_bookmarks())::int, 1, 'a removed bookmark leaves the list');
select tests.reset();

select tests.as_user('bob');
select tests.eq((select count(*) from public.list_bookmarks())::int, 1, 'another reader sees only their own saved items');
select tests.eq((select id from public.list_bookmarks()), tests.id('s1'), 'the other reader sees their own bookmark');
select tests.reset();

-- A bookmark on something that is later unpublished or deleted stays stored
-- but drops out of the list.
update public.sources set deleted_at = now() where id = tests.id('s1');
select tests.as_user('bob');
select tests.eq((select count(*) from public.list_bookmarks())::int, 0, 'a deleted source disappears from the list');
select tests.eq((select total_count from public.list_bookmarks()), null::bigint, 'there is no total when nothing is listed');
select tests.reset();
update public.sources set deleted_at = null where id = tests.id('s1');
select tests.as_user('bob');
select tests.eq((select count(*) from public.list_bookmarks())::int, 1, 'a restored source returns to the list');
select tests.reset();

select tests.as_anon();
select tests.throws('select * from public.list_bookmarks()', '42501', 'visitors cannot list bookmarks');
select tests.reset();
