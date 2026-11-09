select tests.as_user('rita');
select public.submit_for_review('claim', tests.id('c2'));
select tests.eq(tests.affected($$update public.claims set title = 'Edited after submit' where id = tests.id('c2')$$), 0, 'a claim under review can no longer be edited by its author');
select tests.throws($$select public.submit_for_review('claim', tests.id('c2'))$$, '22023', 'a claim under review cannot be submitted twice');
select tests.reset();
select tests.eq((select state::text from public.claims where id = tests.id('c2')), 'pending_review', 'submitting moves the claim to review');
select tests.eq((select count(*) from public.review_items where target_id = tests.id('c2') and decided_at is null)::int, 1, 'submitting queues exactly one review item');
select tests.eq((select count(*) from public.claims where id = tests.id('c2') and released_at is null)::int, 1, 'a submitted claim is not released');

select tests.as_user('rob');
select tests.throws($$select public.submit_for_review('claim', tests.id('c1'))$$, '42501', 'a researcher cannot submit another author''s claim');
select tests.reset();
select tests.as_user('alice');
select tests.throws($$select public.submit_for_review('claim', tests.id('c1'))$$, '42501', 'a plain user cannot submit content');
select tests.throws($$select public.decide_review(gen_random_uuid(), 'approved', null)$$, '42501', 'a plain user cannot decide reviews');
select tests.reset();

select tests.as_user('rita');
select tests.throws($$select public.decide_review((select id from public.review_items where target_id = tests.id('c2')), 'approved', null)$$, '42501', 'a researcher cannot decide reviews');
select tests.reset();

select tests.as_user('ada');
select public.claim_review_item((select id from public.review_items where target_id = tests.id('c2')));
select tests.reset();
select tests.as_user('ada2');
select tests.throws($$select public.decide_review((select id from public.review_items where target_id = tests.id('c2')), 'approved', null)$$, '55006', 'an item claimed by one reviewer cannot be decided by another');
select tests.throws($$select public.claim_review_item((select id from public.review_items where target_id = tests.id('c2')))$$, '55006', 'an item cannot be claimed twice');
select tests.reset();
select tests.as_user('ada');
select tests.throws($$select public.decide_review((select id from public.review_items where target_id = tests.id('c2')), 'rejected', '  ')$$, '22023', 'a rejection requires a reason');
select tests.throws($$select public.decide_review((select id from public.review_items where target_id = tests.id('c2')), 'changes_requested', null)$$, '22023', 'a change request requires a reason');
select public.decide_review((select id from public.review_items where target_id = tests.id('c2')), 'changes_requested', 'Please cite the original dataset');
select tests.throws($$select public.decide_review((select id from public.review_items where target_id = tests.id('c2') order by submitted_at desc limit 1), 'approved', null)$$, '55006', 'a decided item cannot be decided again');
select tests.reset();
select tests.eq((select state::text from public.claims where id = tests.id('c2')), 'changes_requested', 'requesting changes returns the claim to its author');
select tests.eq((select count(*) from public.notifications where user_id = tests.id('rita') and type = 'review_decision')::int, 1, 'the author is notified of the decision');

select tests.as_user('rita');
select tests.eq((select count(*) from public.reviews)::int, 1, 'the author can read the decision on their submission');
select tests.eq((select reason from public.reviews limit 1), 'Please cite the original dataset', 'the author can read the reason');
select tests.eq(tests.affected($$update public.claims set description = 'Now with a dataset reference' where id = tests.id('c2')$$), 1, 'the author can edit after changes were requested');
select public.submit_for_review('claim', tests.id('c2'));
select tests.reset();
select tests.eq((select count(*) from public.review_items where target_id = tests.id('c2'))::int, 2, 'resubmitting queues a new review item');

select tests.as_user('ada2');
select public.decide_review((select id from public.review_items where target_id = tests.id('c2') and decided_at is null), 'approved', null);
select tests.reset();
select tests.eq((select state::text from public.claims where id = tests.id('c2')), 'published', 'an approved claim is published');
select tests.ok((select released_at is not null from public.claims where id = tests.id('c2')), 'an approved claim receives a release date');
select tests.eq((select version from public.claims where id = tests.id('c2')), 1, 'publishing does not bump the version');
select tests.eq((select count(*) from public.entity_versions where entity_id = tests.id('c2') and version = 1)::int, 1, 'publishing records the first version');
select tests.eq((select count(*) from public.reviews where target_id = tests.id('c2'))::int, 2, 'every decision is kept');

select tests.as_user('ada');
insert into public.claims (id, title, category, author_id) values (tests.id('c6'), 'Claim drafted by an admin', 'science', tests.id('ada'));
select public.submit_for_review('claim', tests.id('c6'));
select tests.throws($$select public.decide_review((select id from public.review_items where target_id = tests.id('c6')), 'approved', null)$$, '42501', 'an admin cannot approve their own submission');
select tests.reset();
select tests.as_user('ada2');
select public.decide_review((select id from public.review_items where target_id = tests.id('c6')), 'approved', null);
select tests.reset();
select tests.eq((select state::text from public.claims where id = tests.id('c6')), 'published', 'a second admin can approve it');

select tests.as_user('rob');
select public.submit_for_review('claim', tests.id('c3'));
select tests.reset();
select tests.as_user('ada2');
select public.decide_review((select id from public.review_items where target_id = tests.id('c3')), 'rejected', 'Out of scope for the platform');
select tests.reset();
select tests.eq((select state::text from public.claims where id = tests.id('c3')), 'rejected', 'a rejected claim stays unpublished');
select tests.as_user('rob');
select tests.throws($$select public.submit_for_review('claim', tests.id('c3'))$$, '22023', 'a rejected claim cannot be resubmitted');
select tests.eq(tests.affected($$update public.claims set title = 'Trying again' where id = tests.id('c3')$$), 0, 'a rejected claim cannot be edited');
select tests.reset();

select tests.as_user('alice');
update public.user_settings set notification_preferences = '{"new_evidence": false}'::jsonb;
select tests.reset();
select tests.as_user('rita');
select public.submit_for_review('evidence', tests.id('e3'));
insert into public.evidence (id, claim_id, source_id, title, summary, position, author_id)
values (tests.id('e5'), tests.id('c1'), tests.id('s3'), 'Depends on a draft source', 'Source still in draft.', 'supports', tests.id('rita'));
select public.submit_for_review('evidence', tests.id('e5'));
select tests.reset();
select tests.as_user('ada');
select public.decide_review((select id from public.review_items where target_id = tests.id('e3')), 'approved', null);
select tests.throws($$select public.decide_review((select id from public.review_items where target_id = tests.id('e5')), 'approved', null)$$, '22023', 'evidence cannot be published before its source');
select tests.reset();
select tests.eq((select state::text from public.evidence where id = tests.id('e3')), 'published', 'approved evidence is published');
select tests.eq((select count(*) from public.notifications where user_id = tests.id('bob') and type = 'new_evidence')::int, 2, 'followers of the claim are notified of new evidence');
select tests.eq((select count(*) from public.notifications where user_id = tests.id('alice') and type = 'new_evidence')::int, 1, 'a muted notification type is not delivered');
select tests.eq((select count(*) from public.notifications where user_id = tests.id('rita') and type = 'new_evidence')::int, 0, 'the author is not notified about their own evidence');

select tests.as_user('rob');
select public.propose_revision('claim', tests.id('c1'), '{"title": "Solar capacity grew in the region"}'::jsonb, 'Clarify the wording') as revision_one \gset
select tests.reset();
select tests.eq((select title from public.claims where id = tests.id('c1')), 'Solar capacity doubled in the region', 'a proposed revision never changes published content');
select tests.eq((select version from public.claims where id = tests.id('c1')), 1, 'a proposed revision leaves the version alone');
select tests.eq((select count(*) from public.review_items where target_type = 'revision' and decided_at is null)::int, 1, 'a proposed revision is queued for review');

select tests.as_user('rob');
select tests.throws($$select public.propose_revision('claim', tests.id('c1'), '{"author_id": "x"}'::jsonb, 'Change the author')$$, '22023', 'unsupported fields are refused');
select tests.throws($$select public.propose_revision('claim', tests.id('c1'), '{"first_appeared_on": "not a date"}'::jsonb, 'Fix the date')$$, '22023', 'invalid dates are refused');
select tests.throws($$select public.propose_revision('claim', tests.id('c1'), '{"title": null}'::jsonb, 'Clear the title')$$, '22023', 'required fields cannot be cleared');
select tests.throws($$select public.propose_revision('claim', tests.id('c1'), '{}'::jsonb, 'Nothing')$$, '22023', 'an empty change is refused');
select tests.throws($$select public.propose_revision('claim', tests.id('c1'), '{"keywords": "solar"}'::jsonb, 'Keywords')$$, '22023', 'lists must be arrays');
select tests.throws($$select public.propose_revision('claim', tests.id('c1'), '{"category": "weather"}'::jsonb, 'Category')$$, '22023', 'unknown enum values are refused');
select tests.throws($$select public.propose_revision('source', tests.id('s1'), '{"url": "javascript:alert(1)"}'::jsonb, 'New address')$$, '22023', 'non-http addresses are refused');
select tests.throws($$select public.propose_revision('evidence', tests.id('e1'), '{"source_id": "nope"}'::jsonb, 'Swap source')$$, '22023', 'malformed identifiers are refused');
select tests.throws($$select public.propose_revision('assessment', tests.id('a2'), '{"notes": "x"}'::jsonb, 'Notes')$$, '22023', 'only published content can receive a revision');
select tests.reset();
select tests.as_user('alice');
select tests.throws($$select public.propose_revision('claim', tests.id('c1'), '{"title": "Anything goes"}'::jsonb, 'Why not')$$, '42501', 'a plain user cannot propose revisions');
select tests.reset();

select tests.as_user('ada2');
select public.decide_review((select id from public.review_items where target_id = :'revision_one'::uuid), 'approved', null);
select tests.reset();
select tests.eq((select title from public.claims where id = tests.id('c1')), 'Solar capacity grew in the region', 'an approved revision updates the published claim');
select tests.eq((select version from public.claims where id = tests.id('c1')), 2, 'an approved revision bumps the version');
select tests.eq((select change_summary from public.entity_versions where entity_id = tests.id('c1') and version = 2), 'Clarify the wording', 'the version keeps the change summary');
select tests.eq((select data ->> 'title' from public.entity_versions where entity_id = tests.id('c1') and version = 1), 'Solar capacity doubled in the region', 'earlier versions keep their content');
select tests.eq((select count(*) from public.notifications where user_id = tests.id('alice') and type = 'correction_published')::int, 1, 'people who saved the claim are told about the correction');
select tests.eq((select count(*) from public.notifications where user_id = tests.id('rob') and type = 'correction_published')::int, 0, 'the author of the correction is not notified');
select tests.eq((select state::text from public.content_revisions where id = :'revision_one'::uuid), 'published', 'the applied revision is marked as published');

select tests.as_user('rita');
select public.propose_revision('claim', tests.id('c1'), '{"description": "First edit"}'::jsonb, 'First edit') as revision_a \gset
select public.propose_revision('claim', tests.id('c1'), '{"description": "Second edit"}'::jsonb, 'Second edit') as revision_b \gset
select tests.reset();
select tests.as_user('ada');
select public.decide_review((select id from public.review_items where target_id = :'revision_a'::uuid), 'approved', null);
select tests.throws(format($$select public.decide_review((select id from public.review_items where target_id = %L::uuid), 'approved', null)$$, :'revision_b'), '40001', 'a revision based on an outdated version cannot be applied');
select public.decide_review((select id from public.review_items where target_id = :'revision_b'::uuid), 'rejected', 'Superseded by the first edit');
select tests.reset();
select tests.eq((select description from public.claims where id = tests.id('c1')), 'First edit', 'only the first of two competing revisions was applied');
select tests.eq((select state::text from public.content_revisions where id = :'revision_b'::uuid), 'rejected', 'the competing revision was rejected');

select tests.as_user('ada');
select public.propose_revision('claim', tests.id('c1'), '{"description": "Admin edit"}'::jsonb, 'Admin edit') as revision_c \gset
select tests.throws(format($$select public.decide_review((select id from public.review_items where target_id = %L::uuid), 'approved', null)$$, :'revision_c'), '42501', 'an admin cannot approve their own revision');
select tests.reset();

select tests.as_user('alice');
select tests.eq(tests.affected($$insert into public.reports (user_id, kind, target_type, target_id, reason) values (tests.id('alice'), 'broken_source', 'claim', tests.id('c1'), 'The link in the first source no longer opens')$$), 1, 'a user can report a claim');
select tests.throws($$insert into public.reports (user_id, kind, target_type, target_id, reason) values (tests.id('alice'), 'broken_source', 'claim', tests.id('c1'), 'Same report again')$$, '23505', 'an open report cannot be duplicated');
select tests.throws($$insert into public.reports (user_id, kind, target_type, target_id, reason) values (tests.id('alice'), 'broken_source', 'claim', tests.id('c3'), 'This claim is not public')$$, '42501', 'a user cannot report content they cannot see');
select tests.throws($$insert into public.reports (user_id, kind, target_type, target_id, reason, status) values (tests.id('alice'), 'request_correction', 'claim', tests.id('c1'), 'Mark this as resolved', 'resolved')$$, '42501', 'a user cannot create a resolved report');
select tests.throws($$insert into public.reports (user_id, kind, target_type, target_id, reason) values (tests.id('bob'), 'request_correction', 'claim', tests.id('c1'), 'Reporting as someone else')$$, '42501', 'a user cannot report as someone else');
select tests.eq((select count(*) from public.reports)::int, 1, 'a user can read their own reports');
select tests.reset();
select tests.eq((select title from public.claims where id = tests.id('c1')), 'Solar capacity grew in the region', 'a report does not change published content');
select tests.eq((select count(*) from public.review_items where target_type = 'report')::int, 1, 'a report is queued for review');
select tests.as_user('bob');
select tests.eq((select count(*) from public.reports)::int, 0, 'users cannot read each other''s reports');
select tests.reset();
select tests.as_user('ada');
select tests.throws($$select public.decide_review((select id from public.review_items where target_type = 'report'), 'changes_requested', 'Unclear')$$, '22023', 'a report can only be accepted or dismissed');
select public.decide_review((select id from public.review_items where target_type = 'report'), 'approved', 'Confirmed, a correction will follow');
select tests.reset();
select tests.eq((select status::text from public.reports limit 1), 'resolved', 'accepting a report resolves it');
select tests.eq((select count(*) from public.notifications where user_id = tests.id('alice') and type = 'report_status_changed')::int, 1, 'the reporter is notified');

select tests.as_user('ada');
select public.change_claim_status(tests.id('c1'), 'conflicting_evidence', 'A newer study reaches a different result');
select tests.throws($$select public.change_claim_status(tests.id('c1'), 'conflicting_evidence', 'Same again')$$, '22023', 'a status change must change the status');
select tests.throws($$select public.change_claim_status(tests.id('c1'), 'archived', 'ok')$$, '22023', 'a status change needs a real reason');
select tests.reset();
select tests.eq((select status::text from public.claims where id = tests.id('c1')), 'conflicting_evidence', 'the status changed');
select tests.eq((select count(*) from public.claim_status_changes where claim_id = tests.id('c1'))::int, 1, 'the change is recorded with its reason');
select tests.eq((select version from public.claims where id = tests.id('c1')), 3, 'a status change does not count as an edit');
select tests.as_user('rita');
select tests.throws($$select public.change_claim_status(tests.id('c1'), 'archived', 'Not my call')$$, '42501', 'a researcher cannot change a status');
select tests.reset();

select tests.as_user('rita');
select tests.eq(tests.affected($$update public.claims set title = 'Rewrite a published claim' where id = tests.id('c1')$$), 0, 'a researcher cannot edit published content directly');
insert into public.claims (id, title, category, author_id) values (tests.id('c7'), 'Another draft', 'science', tests.id('rita'));
select tests.throws($$update public.claims set status = 'archived' where id = tests.id('c7')$$, '42501', 'a researcher cannot set the status directly');
select tests.throws($$update public.claims set version = 9 where id = tests.id('c7')$$, '42501', 'the version cannot be edited directly');
select tests.throws($$update public.claims set state = 'published' where id = tests.id('c7')$$, '42501', 'a researcher cannot publish');
select tests.throws($$update public.claims set author_id = tests.id('rob') where id = tests.id('c7')$$, '42501', 'a draft cannot be handed to someone else directly');
select tests.throws($$insert into public.claims (title, category, author_id, state) values ('Straight to published', 'science', tests.id('rita'), 'published')$$, '42501', 'a researcher cannot insert published content');
select tests.throws($$insert into public.claims (title, category, author_id) values ('Pretending to be Rob', 'science', tests.id('rob'))$$, '42501', 'a researcher cannot create content in someone else''s name');
select tests.eq(tests.affected($$update public.claims set deleted_at = now() where id = tests.id('c7')$$), 1, 'an author can soft-delete their own draft');
select tests.eq(tests.affected($$update public.claims set deleted_at = now() where id = tests.id('c1')$$), 0, 'an author cannot delete published content');
select tests.reset();
select tests.eq((select deleted_by from public.claims where id = tests.id('c7')), tests.id('rita'), 'a soft delete records who did it');

select tests.as_user('ada');
update public.claims set description = 'Corrected directly by an admin' where id = tests.id('c1');
select tests.reset();
select tests.eq((select version from public.claims where id = tests.id('c1')), 4, 'an admin correction bumps the version');
select tests.eq((select count(*) from public.entity_versions where entity_id = tests.id('c1'))::int, 4, 'every published version is kept');

select tests.as_user('rita');
select public.reorder_evidence(tests.id('c1'), array[tests.id('e3'), tests.id('e2'), tests.id('e1')]);
select tests.throws($$select public.reorder_evidence(tests.id('c1'), array[tests.id('e3'), tests.id('e1')])$$, '22023', 'a reorder must list every evidence item');
select tests.throws($$select public.reorder_evidence(tests.id('c1'), array[tests.id('e3'), tests.id('e3'), tests.id('e1'), tests.id('e2')])$$, '22023', 'a reorder cannot repeat an item');
select tests.reset();
select tests.eq((select array_agg(id order by sort_order) from public.evidence where id in (tests.id('e1'), tests.id('e2'), tests.id('e3'))), array[tests.id('e3'), tests.id('e2'), tests.id('e1')], 'evidence follows the new order');
select tests.eq((select version from public.evidence where id = tests.id('e1')), 1, 'reordering does not count as an edit');
select tests.as_user('rob');
select tests.throws($$select public.reorder_evidence(tests.id('c1'), array[tests.id('e3'), tests.id('e2'), tests.id('e1')])$$, '42501', 'only the claim author or an admin can reorder');
select tests.reset();

select tests.as_user('rita');
select tests.eq((select count(*) from public.find_duplicate_sources('https://www.EXAMPLE.test/energy/', 'Unrelated', 'Nobody') where reason = 'same_url')::int, 1, 'duplicate detection matches a normalised address');
select tests.eq((select count(*) from public.find_duplicate_sources('https://other.test/a', 'Regional Energy Outlook', 'Harbor Institute') where reason = 'similar_title')::int, 1, 'duplicate detection matches near-identical title and publisher');
select tests.eq((select count(*) from public.find_duplicate_sources('https://other.test/a', 'Completely different', 'Another publisher'))::int, 0, 'unrelated sources are not flagged');
select tests.reset();

select tests.throws($$insert into public.sources (title, publisher, url) values ('Bad address', 'Anyone', 'javascript:alert(1)')$$, '23514', 'source addresses must be http or https');
select tests.throws($$insert into public.sources (title, publisher, url, published_on, accessed_on) values ('Time travel', 'Anyone', 'https://example.test/t', '2025-05-01', '2025-04-01')$$, '23514', 'a source cannot be accessed before it was published');
select tests.throws($$insert into public.claims (title, category, origin_url) values ('Bad origin', 'science', 'ftp://example.test')$$, '23514', 'origin addresses must be http or https');
select tests.eq(private.normalize_url('HTTPS://www.Example.org/a/b/?utm_source=x&id=3&fbclid=9#top'), 'example.org/a/b?id=3', 'normalisation drops tracking parameters, fragments and trailing slashes');

select tests.as_user('ada');
select public.set_user_role(tests.id('bob'), 'researcher');
select tests.reset();
select tests.eq((select role::text from public.profiles where id = tests.id('bob')), 'researcher', 'an admin can promote a user');
select tests.ok(exists (select 1 from public.audit_logs where entity_type = 'profiles' and actor_id = tests.id('ada') and after ->> 'role' = 'researcher'), 'a role change is audited with its actor');
select tests.as_user('alice');
select tests.throws($$select public.set_user_role(tests.id('alice'), 'admin')$$, '42501', 'a user cannot promote themselves');
select tests.reset();
select tests.as_user('ada');
select public.set_user_role(tests.id('ada2'), 'user');
select tests.throws($$select public.set_user_role(tests.id('ada'), 'user')$$, '22023', 'the last admin cannot be demoted');
select tests.reset();

select tests.ok(exists (select 1 from public.audit_logs where entity_type = 'claims' and action = 'update' and before ->> 'title' = 'Solar capacity doubled in the region' and after ->> 'title' = 'Solar capacity grew in the region'), 'an edit is audited with before and after values');

delete from auth.users where id = tests.id('rob');
select tests.eq((select count(*) from public.profiles where id = tests.id('rob'))::int, 0, 'deleting an account removes the profile');
select tests.eq((select count(*) from public.claims where id = tests.id('c4') and author_id is null)::int, 1, 'content survives the deletion of its author');

select tests.as_user('alice');
insert into public.reports (user_id, kind, target_type, target_id, reason)
select tests.id('alice'), k.kind, t.type, t.id, 'Reported while testing the daily limit'
from unnest(enum_range(null::public.report_kind)) as k(kind)
cross join (values ('claim'::public.content_entity, tests.id('c1')), ('claim', tests.id('c4')), ('source', tests.id('s1')), ('source', tests.id('s2'))) as t(type, id)
where not (k.kind = 'broken_source' and t.id = tests.id('c1'));
select tests.throws($$insert into public.reports (user_id, kind, target_type, target_id, reason) values (tests.id('alice'), 'request_correction', 'claim', tests.id('c2'), 'One report too many')$$, '53400', 'reporting is limited per day');
select tests.reset();
