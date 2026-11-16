# Reports

Any signed-in reader can report a problem with a claim or a source from its page:
a broken link, wrong information, a better source, missing contradicting evidence or
a correction. The form sits in a collapsed "Report a problem" box at the end of the page.

A report becomes an item in the admin review queue. An admin accepts or dismisses it,
and the reader sees the outcome under **Your reports** (`/reports`): waiting, being
reviewed, accepted or dismissed.

## Limits

The database enforces them, so they hold for every client:

| Rule                                                 | Answer shown                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| One open report of the same kind per reader and item | "You already have an open report of this kind for this item." |
| A daily cap on reports per reader                    | "You have sent many reports today."                           |
| Only items the reader can see can be reported        | "You cannot report this item."                                |

## Review overview

The top of the review queue shows a summary for admins: open items, items not yet
taken, items being reviewed, the longest wait in days and decisions in the last seven
days. It is read through `review_overview()`, which answers admins only
(`supabase/tests/review-overview.test.sql`).

## Applying the migration

Run `supabase/migrations/20261117000100_review_overview.sql` in the Supabase SQL editor.
