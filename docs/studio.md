# Studio

The Studio is where researchers and admins write new claims and sources and send
them for review. Readers never see it: for the `user` role the pages do not exist
(404) and the menu entry is hidden.

## What it covers

- `/studio` lists the signed-in author's own claims and sources, newest first, each
  with its state: draft, in review, changes requested, published or rejected.
- `/studio/claims/new` and `/studio/sources/new` create a draft.
- `/studio/claims/[id]` and `/studio/sources/[id]` edit a draft (or an item sent back
  with requested changes) and send it for review. In every other state the same page
  shows the item read-only, with the reviewer's reason when there is one.

Adding evidence, assessments and revisions of published content come in the next
steps; so does the admin review queue.

## How it follows the rules

- Drafts are ordinary inserts and updates. Row level security only lets an author
  insert a draft of their own and change it while it is a draft or has changes
  requested. The server actions check the same things first so the answer can be
  worded, but the database decides.
- "Send for review" calls `submit_for_review`; nothing else moves an item into the
  queue. It cannot be undone by the author.
- A save that matches no row (the item was sent for review in another tab) is
  reported as "can no longer be edited" instead of silently doing nothing.
- Creating a source first calls `find_duplicate_sources`. Matches by address or by
  near-identical title and publisher are listed and the author can create it anyway.
  If the check itself fails, saving goes ahead.

## Forms

Every form is a React form action with a progress message, a confirmation and a
dismissible error shown as a toast. A failed save returns what was typed, because
the browser empties a form after any action. Without scripts the forms do not
submit, since the result is rendered by the client; this is acceptable for a
staff-only tool, and the public pages do not depend on it.

Input is validated in `src/lib/data/studio-params.ts`, mirroring the database
constraints (lengths counted in characters, http(s) addresses, real calendar dates,
access date not before publication date, at most 20 keywords and 30 authors).
Keywords are separated by commas or line breaks, including Arabic and CJK commas;
authors go one per line.

## Where things live

| Concern                | File                                 |
| ---------------------- | ------------------------------------ |
| Parsing and validation | `src/lib/data/studio-params.ts`      |
| Reads                  | `src/lib/data/studio.ts`             |
| Actions                | `src/app/[locale]/studio/actions.ts` |
| Pages                  | `src/app/[locale]/studio/`           |
| Forms                  | `src/components/studio/`             |
| Toast                  | `src/components/action-toast.tsx`    |
