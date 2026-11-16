# Live updates and offline

## Live updates

The review queue, a single review item and the author's Studio list refresh by
themselves when the rows they show change. Another admin taking an item, a decision
on something you submitted, or a new submission appears without reloading.

The page listens to Supabase Realtime (`postgres_changes`) and asks Next.js to
re-render the server components when something arrives. Bursts of changes are folded
into a single refresh half a second later. Nothing is trusted from the event itself:
the page reads the data again through the normal, access-checked queries.

Realtime only delivers a change to someone who may read that row, so row level
security decides who hears about what. The Studio list also filters on
`author_id`, so a researcher only receives events for their own work.

Tables in the `supabase_realtime` publication are set in
`supabase/migrations/20261118000100_realtime.sql`:
`review_items`, `claims`, `sources`, `evidence`, `source_assessments`, `notifications`.

If the connection drops the page keeps showing what it has. It never depends on
Realtime to work.

## Offline

When the browser reports no connection, a notice appears at the top of every page:
changes cannot be saved until the connection returns. It uses the browser's online
and offline events and hides itself again once the connection is back.

## Applying the migration

Run `supabase/migrations/20261118000100_realtime.sql` in the Supabase SQL editor.
