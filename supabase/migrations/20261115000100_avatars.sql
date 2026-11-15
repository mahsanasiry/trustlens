-- Profile pictures. The bucket is public because avatars are shown to anyone who
-- sees a published claim or source; what matters is who may write to it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Every file lives under a folder named after its owner: <user id>/<file>.
-- Public files are served without a policy. This one exists because replacing or
-- deleting a file also needs to read its row, and it keeps the listing to the owner.
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- profiles.avatar_path is writable by its owner, so keep it pointing at their own
-- folder. Without this a user could point their picture at someone else's file.
alter table public.profiles
  add constraint profiles_avatar_path_own_folder check (
    avatar_path is null
    or (
      char_length(avatar_path) <= 200
      and avatar_path like id::text || '/%'
      and avatar_path !~ '\.\.'
    )
  );
