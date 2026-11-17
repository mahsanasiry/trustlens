# 5. Update live pages by refreshing, not by patching client state

Status: accepted

## Context

Admins working through the review queue should see an item disappear when a colleague
takes it, and researchers should see a decision arrive. The pages that show this are
server components, and what each person may see depends on row level security.

## Decision

A small client component listens to Supabase Realtime `postgres_changes` for the tables
a page shows and calls `router.refresh()`, debounced so a burst of changes becomes one
refresh. The event is only a signal. The page reads its data again through the normal,
access-checked queries.

Realtime delivers a change only to someone allowed to read the row, so security stays in
the database. Pages never depend on the connection: if it drops, they keep showing what
they have.

## Consequences

- There is one code path for rendering data, not two.
- Each event costs a server render. That is acceptable for the three pages that use it
  (the review queue, one review item and the studio list), and is not a model for
  high-traffic pages.
- The component filters by `author_id` where a page is personal, so a researcher only
  hears about their own work.

See [realtime.md](../realtime.md).
