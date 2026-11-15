# Sources, checks and comparison

- `/sources` lists published sources, 12 per page, with a filter by type. Each card shows eight small marks, one per check, and a count for each state.
- `/sources/[id]` shows one source: who published it, the authors, dates, a link to the original, every check with its notes, and the published claims that cite it as evidence (with the evidence position).
- `/sources/compare?ids=...` puts two to four sources side by side, one row per check. Sources can be picked on the list page with the checkboxes (a plain GET form, no script needed) and removed from the comparison table. A fifth id is ignored and the page says so.

## Checks are not a score

The eight checks (authors, publisher, citations, publication date, data collection, independent verifiability, conflicts of interest, corrections) each take one of four states: verified, partly verified, not verified, not applicable. The site never adds them up into a rating, and no state is coloured as good or bad. The states differ by shape (solid, half, empty and dashed squares) as well as by text, so nothing depends on colour.

A criterion with no assessment row is shown as "Not assessed yet", which is different from "Not verified".

## Data access

`src/lib/data/sources.ts` reads through the server Supabase client, so row-level security decides visibility, and the queries also filter on published state and soft deletion. A compare request keeps the order the reader chose; ids that are unknown or not published drop out, and fewer than two remaining ids shows a prompt to pick more.
