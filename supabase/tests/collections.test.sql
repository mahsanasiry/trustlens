select tests.as_user('alice');
select tests.eq((select count(*) from public.list_my_collections())::int, 3, 'a reader lists only the collections they own');
select tests.eq((select total_count from public.list_my_collections(1, 0)), 3::bigint, 'the total counts every owned collection');
select tests.eq((select item_count from public.list_my_collections() where id = tests.id('k-public')), 2::bigint, 'the item count leaves out unpublished items');
select tests.eq((select count(*) from public.list_collection_items(tests.id('k-public')))::int, 2, 'a collection lists only its published items');
select tests.eq((select id from public.list_collection_items(tests.id('k-public')) limit 1), tests.id('c1'), 'items come back in order');
select tests.eq((select kind from public.list_collection_items(tests.id('k-public')) offset 1 limit 1), 'source', 'a source item is reported as a source');

select public.add_collection_item(tests.id('k-private'), 'claim', tests.id('c4'));
select public.add_collection_item(tests.id('k-private'), 'source', tests.id('s2'));
select public.add_collection_item(tests.id('k-private'), 'claim', tests.id('c4'));
select tests.eq((select count(*) from public.list_collection_items(tests.id('k-private')))::int, 2, 'adding the same item twice does not duplicate it');
select tests.eq((select id from public.list_collection_items(tests.id('k-private')) limit 1), tests.id('c4'), 'new items go to the end');
select tests.throws($$select public.add_collection_item(tests.id('k-private'), 'person', tests.id('c4'))$$, '22023', 'an unknown item kind is rejected');
select tests.throws($$select public.add_collection_item(tests.id('k-private'), 'claim', tests.id('c2'))$$, '42501', 'a reader cannot add a draft claim');
select tests.throws($$select public.add_collection_item(tests.id('k-bob'), 'claim', tests.id('c1'))$$, '42501', 'a reader cannot add to a collection shared with them');

select public.move_collection_item(tests.id('k-private'), (select item_id from public.list_collection_items(tests.id('k-private')) offset 1 limit 1), -1);
select tests.eq((select id from public.list_collection_items(tests.id('k-private')) limit 1), tests.id('s2'), 'moving an item up swaps it with the one before');
select public.move_collection_item(tests.id('k-private'), (select item_id from public.list_collection_items(tests.id('k-private')) limit 1), -1);
select tests.eq((select id from public.list_collection_items(tests.id('k-private')) limit 1), tests.id('s2'), 'moving the first item up changes nothing');
select public.move_collection_item(tests.id('k-private'), (select item_id from public.list_collection_items(tests.id('k-private')) offset 1 limit 1), 1);
select tests.eq((select id from public.list_collection_items(tests.id('k-private')) offset 1 limit 1), tests.id('c4'), 'moving the last item down changes nothing');
select tests.eq((select array_agg(position order by position) from public.collection_items where collection_id = tests.id('k-private')), array[1, 2], 'positions are renumbered from one');
select tests.throws($$select public.move_collection_item(tests.id('k-private'), tests.id('c1'), 1)$$, 'P0002', 'moving an item that is not in the collection is rejected');
select tests.throws($$select public.move_collection_item(tests.id('k-private'), gen_random_uuid(), 2)$$, '22023', 'a direction other than one step is rejected');
select tests.throws($$select public.move_collection_item(tests.id('k-bob'), gen_random_uuid(), 1)$$, '42501', 'a reader cannot reorder a collection they do not own');
select tests.reset();

select tests.as_user('bob');
select tests.eq((select count(*) from public.list_my_collections())::int, 1, 'another reader lists only their own collections');
select tests.throws($$select public.add_collection_item(tests.id('k-public'), 'claim', tests.id('c4'))$$, '42501', 'a reader cannot add to a public collection they do not own');
select tests.reset();

select tests.as_anon();
select tests.eq((select title from public.get_shared_collection_summary(tests.id('token-unlisted'))), 'Alice unlisted', 'an unlisted collection opens through its link');
select tests.eq((select owner_name from public.get_shared_collection_summary(tests.id('token-public'))), 'Alice', 'the summary names the owner');
select tests.eq((select count(*) from public.get_shared_collection_summary(tests.id('token-private')))::int, 0, 'a private collection has no share summary');
select tests.eq((select count(*) from public.get_shared_collection_summary(gen_random_uuid()))::int, 0, 'an unknown token has no share summary');
select tests.eq((select count(*) from public.list_shared_collection_items(tests.id('token-public')))::int, 2, 'a shared collection lists only published items');
select tests.eq((select total_count from public.list_shared_collection_items(tests.id('token-public'), 1, 0)), 2::bigint, 'the shared total counts every listed item');
select tests.eq((select count(*) from public.list_shared_collection_items(tests.id('token-public'), 1, 1))::int, 1, 'shared items page with an offset');
select tests.eq((select count(*) from public.list_shared_collection_items(tests.id('token-private')))::int, 0, 'a private collection lists nothing through its token');
select tests.throws('select * from public.list_my_collections()', '42501', 'visitors cannot list collections');
select tests.throws($$select public.add_collection_item(tests.id('k-public'), 'claim', tests.id('c4'))$$, '42501', 'visitors cannot add to a collection');
select tests.reset();
