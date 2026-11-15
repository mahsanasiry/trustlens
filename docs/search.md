# Search

`/search` looks across published claims and sources. It is a plain GET form (`q`, `kind`, `page`), so it works without scripts and every search has a shareable URL.

## How matching works

The database function `public.search_content` does the work. A row matches when either of these holds:

- **Full text.** The query is parsed with `websearch_to_tsquery('simple', …)` and compared with the row's `search_vector`. The `simple` configuration applies no stemming, so one language's rules are never applied to another language's text. Operator characters in the query are treated as plain text.
- **Substring.** The query appears, ignoring case, in the title (and in the publisher, for sources). This covers partial words such as "transi" and scripts written without spaces, such as Chinese and Japanese, which the vectors cannot split into words. LIKE wildcards typed by the reader are escaped and matched literally.

Results are ordered by a score (full-text rank, plus a bonus for a title match, plus a smaller one for a publisher match), then by release date and id, so paging is stable.

## What is never searched

Drafts, items awaiting review and soft-deleted rows. The function filters on `state = 'published'` and `deleted_at is null` itself, and row-level security applies on top because the function runs with the caller's rights.

## Limits

- Queries are trimmed, whitespace is collapsed and the length is capped at 200 characters.
- At least two characters are needed, or one character outside ASCII (a single Chinese or Japanese character can be a whole word).
- The page size is 12; the function caps any requested limit at 50.
- Each page returns the total match count with its rows, so the page count needs no second query.

## Known limits of this approach

Substring matching on titles uses the trigram indexes, but a one-character query for a non-Latin script cannot use them and scans the table. That is acceptable at the current data size and should be revisited if the content grows into the hundreds of thousands of rows.

Ranking is deliberately simple. It does not weigh recency, popularity or reader behaviour.
