select tests.as_user('ada');
select tests.eq((select public.review_overview() ->> 'open'), '0', 'an empty queue has nothing open');
select tests.eq((select public.review_overview() -> 'oldest_submitted_at'), 'null'::jsonb, 'an empty queue has no oldest item');
select tests.reset();

select tests.as_user('rita');
select public.submit_for_review('claim', tests.id('c2'));
select public.propose_revision('claim', tests.id('c1'), '{"title": "Another title for claim one"}'::jsonb, 'Reword the title');
select tests.reset();

select tests.as_user('ada');
select tests.eq((select public.review_overview() ->> 'open'), '2', 'open items are counted');
select tests.eq((select public.review_overview() ->> 'unclaimed'), '2', 'nothing is taken yet');
select tests.eq((select public.review_overview() #>> '{by_type,claim}'), '1', 'items are counted by type');
select tests.eq((select public.review_overview() #>> '{by_type,revision}'), '1', 'revisions have their own count');
select tests.ok((select (public.review_overview() ->> 'oldest_submitted_at') is not null), 'the oldest submission is reported');

select public.claim_review_item((select item_id from public.list_review_queue('claim')));
select tests.eq((select public.review_overview() ->> 'claimed'), '1', 'a taken item is counted as taken');
select tests.eq((select public.review_overview() ->> 'unclaimed'), '1', 'and no longer as untaken');

select public.decide_review((select item_id from public.list_review_queue('claim')), 'changes_requested', 'Please add a source');
select tests.eq((select public.review_overview() ->> 'open'), '1', 'a decided item is no longer open');
select tests.eq((select public.review_overview() ->> 'decided_last_7_days'), '1', 'recent decisions are counted');
select tests.reset();

select tests.as_user('rita');
select tests.throws($$select public.review_overview()$$, '42501', 'a researcher cannot read the overview');
select tests.reset();

select tests.as_anon();
select tests.throws($$select public.review_overview()$$, '42501', 'visitors cannot read the overview');
select tests.reset();
