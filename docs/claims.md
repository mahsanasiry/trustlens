# Claims pages

Public, read-only pages for published claims.

- `/claims` lists published claims, 12 per page, newest release first. The category and status filters are a plain GET form, so they work without scripts and produce shareable URLs. Unknown filter values are ignored rather than rejected.
- `/claims/[id]` shows one claim with its evidence grouped by position (supports, adds context, contradicts), the status history and related claims. An id that is not shaped like a UUID, or a claim that is not published, returns the 404 page.

## Data access

`src/lib/data/claims.ts` reads through the server Supabase client, so row-level security decides what is visible. The queries also filter on `state = 'published'` and `deleted_at is null` explicitly, which keeps an author's own drafts out of public lists. Every row is parsed with Zod before it reaches a component.

Ids are checked by shape only. Postgres can generate ids from a hash (the demo data does), and a strict RFC variant check would reject them.

## Statuses

A status describes the state of the evidence. The badge styling is deliberately neutral: no status is coloured as good or bad, and the pages say so in text.

## Text direction

Claim, evidence and source text is user content in its own language. It carries `lang` from the stored language and `dir="auto"`, so English text inside an Arabic page keeps its own direction.
