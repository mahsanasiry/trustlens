-- Rita (researcher) submits a claim and a source; Alice reports the published claim.
select tests.as_user('rita');
select public.submit_for_review('claim', tests.id('c2'));
insert into public.sources (id, title, publisher, url, author_id)
values (tests.id('s-new'), 'A source in review', 'Test Press', 'https://example.test/new', tests.id('rita'));
select public.submit_for_review('source', tests.id('s-new'));
select public.propose_revision('claim', tests.id('c1'), '{"title": "A better title for claim one"}'::jsonb, 'Clearer wording');
select tests.reset();

select tests.as_user('alice');
insert into public.reports (user_id, kind, target_type, target_id, reason)
values (tests.id('alice'), 'incorrect_information', 'claim', tests.id('c1'), 'The figure in the claim looks wrong');
select tests.reset();

select tests.as_user('ada');
select tests.eq((select count(*) from public.list_review_queue())::int, 4, 'an admin sees every open item');
select tests.eq((select total_count from public.list_review_queue(null, 2, 0) limit 1), 4::bigint, 'the total counts every open item, not only the page');
select tests.eq((select count(*) from public.list_review_queue(null, 2, 2))::int, 2, 'the offset moves to the next page');
select tests.eq((select count(*) from public.list_review_queue('claim'))::int, 1, 'the queue can be limited to one kind');
select tests.eq((select title from public.list_review_queue('claim')), (select title from public.claims where id = tests.id('c2')), 'a claim is listed by its title');
select tests.eq((select title from public.list_review_queue('revision')), 'Clearer wording', 'a revision is listed by its summary');
select tests.eq((select title from public.list_review_queue('report')), 'The figure in the claim looks wrong', 'a report is listed by its reason');
select tests.eq((select submitter_name from public.list_review_queue('source')), (select display_name from public.profiles where id = tests.id('rita')), 'the submitter is named');
select tests.eq((select item_id from public.list_review_queue() limit 1), (select id from public.review_items where decided_at is null order by submitted_at, id limit 1), 'the oldest submission comes first');

select tests.eq(
  (select public.get_review_item((select item_id from public.list_review_queue('claim')))) #>> '{subject,title}',
  (select title from public.claims where id = tests.id('c2')),
  'the detail carries the submitted claim');
select tests.eq(
  (select public.get_review_item((select item_id from public.list_review_queue('revision')))) #>> '{subject,payload,title}',
  'A better title for claim one',
  'the detail of a revision carries the proposed change');
select tests.eq(
  (select public.get_review_item((select item_id from public.list_review_queue('revision')))) #>> '{current,id}',
  tests.id('c1')::text,
  'the detail of a revision carries the item it would change');
select tests.eq(
  (select public.get_review_item((select item_id from public.list_review_queue('report')))) #>> '{subject,target_title}',
  (select title from public.claims where id = tests.id('c1')),
  'the detail of a report names what was reported');
select tests.eq(public.get_review_item(gen_random_uuid()), null::jsonb, 'an unknown item has no detail');
select tests.reset();

select tests.as_user('rita');
select tests.eq((select count(*) from public.list_review_queue())::int, 0, 'a researcher gets an empty queue, even for their own submissions');
select tests.throws($$select public.get_review_item((select id from public.review_items limit 1))$$, '42501', 'a researcher cannot read review details');
select tests.reset();

select tests.as_user('alice');
select tests.eq((select count(*) from public.list_review_queue())::int, 0, 'a reader gets an empty queue');
select tests.throws($$select public.get_review_item(gen_random_uuid())$$, '42501', 'a reader cannot read review details');
select tests.reset();

select tests.as_anon();
select tests.throws('select * from public.list_review_queue()', '42501', 'visitors cannot list the queue');
select tests.reset();

-- A decided item leaves the queue but can still be read, with its decision.
select tests.as_user('ada');
select public.decide_review((select item_id from public.list_review_queue('claim')), 'changes_requested', 'Please cite the dataset');
select tests.eq((select count(*) from public.list_review_queue())::int, 3, 'a decided item leaves the queue');
select tests.eq(
  (select public.get_review_item((select id from public.review_items where target_id = tests.id('c2') and decided_at is not null))) #>> '{decision,reason}',
  'Please cite the dataset',
  'a decided item still shows its decision');
select tests.reset();
