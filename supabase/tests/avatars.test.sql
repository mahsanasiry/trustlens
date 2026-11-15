select tests.eq((select public from storage.buckets where id = 'avatars'), true, 'the avatar bucket is public so pictures can be shown');
select tests.eq((select file_size_limit from storage.buckets where id = 'avatars'), 2097152::bigint, 'the bucket caps files at 2 MB');
select tests.eq((select array_length(allowed_mime_types, 1) from storage.buckets where id = 'avatars'), 3, 'the bucket accepts three image types only');

select tests.as_user('alice');
select tests.eq(
  tests.affected(format($f$insert into storage.objects (bucket_id, name) values ('avatars', '%s/a.png')$f$, tests.id('alice'))),
  1, 'a member can add a picture to their own folder');
select tests.throws(
  format($f$insert into storage.objects (bucket_id, name) values ('avatars', '%s/a.png')$f$, tests.id('bob')),
  '42501', 'a member cannot add a picture to another folder');
select tests.throws(
  $f$insert into storage.objects (bucket_id, name) values ('avatars', 'loose.png')$f$,
  '42501', 'a file outside any user folder is refused');
select tests.throws(
  $f$insert into storage.objects (bucket_id, name) values ('documents', 'x/a.png')$f$,
  '42501', 'the policy covers the avatar bucket only');
select tests.reset();

insert into storage.objects (bucket_id, name) values ('avatars', tests.id('bob')::text || '/b.png');

select tests.as_user('alice');
select tests.eq(tests.affected(format($f$delete from storage.objects where name = '%s/b.png'$f$, tests.id('bob'))), 0, 'a member cannot remove another member''s picture');
select tests.eq(tests.affected(format($f$update storage.objects set name = '%s/c.png' where name = '%s/b.png'$f$, tests.id('alice'), tests.id('bob'))), 0, 'a member cannot move another member''s picture into their folder');
select tests.eq(tests.affected(format($f$delete from storage.objects where name = '%s/a.png'$f$, tests.id('alice'))), 1, 'a member can remove their own picture');
select tests.reset();

select tests.as_user('alice');
select tests.eq(tests.affected(format($f$update public.profiles set avatar_path = '%s/a.png' where id = '%s'$f$, tests.id('alice'), tests.id('alice'))), 1, 'a member can point their profile at their own folder');
select tests.throws(format($f$update public.profiles set avatar_path = '%s/a.png' where id = '%s'$f$, tests.id('bob'), tests.id('alice')), '23514', 'a profile cannot point at another folder');
select tests.throws(format($f$update public.profiles set avatar_path = '%s/../x.png' where id = '%s'$f$, tests.id('alice'), tests.id('alice')), '23514', 'a path that climbs out of the folder is refused');
select tests.eq(tests.affected(format($f$update public.profiles set avatar_path = null where id = '%s'$f$, tests.id('alice'))), 1, 'a picture can be removed from the profile');
select tests.reset();

select tests.as_anon();
select tests.throws($f$insert into storage.objects (bucket_id, name) values ('avatars', 'x/a.png')$f$, '42501', 'visitors cannot upload');
select tests.reset();
