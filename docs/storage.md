# Storage

Profile pictures are the only uploads so far. They live in the `avatars` bucket.

## Rules

- The bucket is public: a picture is shown next to a name on published content, so
  reading needs no sign-in. Writing is limited by row-level security.
- Every file sits in a folder named after its owner (`<user id>/<timestamp>.<ext>`).
  Insert, update, delete and select policies on `storage.objects` all require the
  first folder to equal `auth.uid()`. Select is included because replacing or removing
  a file reads its row first; public downloads do not depend on it.
- The bucket accepts PNG, JPEG and WebP up to 2 MB. The same limits are checked in
  the server action, and the type is read from the file's first bytes rather than
  from the name or the browser's reported type.
- `profiles.avatar_path` can only point into its owner's folder (a check constraint),
  so a profile cannot display someone else's file.

## Flow

1. The profile form posts to the `updateProfile` server action (works without scripts).
2. A new file is uploaded under a fresh name, so browsers and CDNs never serve a stale
   picture.
3. The profile row is updated. If that fails, the new file is removed again.
4. The previous file is removed on a best-effort basis; a failure leaves an unused
   file but never a broken profile.

Phone photos are several megabytes, so the browser first crops the chosen image to a
square and scales it to at most 512 pixels (`prepare-avatar.ts`), which leaves a file
of a few dozen kilobytes. Originals up to 25 MB are accepted. The 2 MB limit above is
what the server and bucket enforce on the file that is actually sent.

Server actions allow bodies up to 3 MB (`next.config.ts`); the framework default of
1 MB would reject pictures the bucket accepts.

## Where things live

| Concern              | File                                             |
| -------------------- | ------------------------------------------------ |
| Bucket and policies  | `supabase/migrations/20261115000100_avatars.sql` |
| Policy tests         | `supabase/tests/avatars.test.sql`                |
| Type detection, URLs | `src/lib/storage/avatar.ts`                      |
| Form parsing         | `src/lib/data/profile-params.ts`                 |
| Action and page      | `src/app/[locale]/profile/`                      |
| Picture or initial   | `src/components/avatar.tsx`                      |
