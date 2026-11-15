# Demo data

`supabase/seed/demo_data.sql` fills a project with fictional content so every screen has
something real to show: published claims with evidence on several sides, sources with
assessments, version history, a review queue, reports, collections and notifications.

Everything is invented. Organisations, people, figures and URLs do not exist, and the
`.example` domains are reserved and never resolve. Rows carry `is_demo = true`, and the
site's footer says so.

## What it contains

| Content                         | Amount                                                              |
| ------------------------------- | ------------------------------------------------------------------- |
| Published claims                | 77, across six categories and every evidence status                 |
| Published sources               | 110, of every source type                                           |
| Published evidence              | 125, split across supports, adds context and contradicts            |
| Source assessments              | about 780, using all eight criteria                                 |
| Claims in other languages       | 3 (Spanish, German, Persian), to show content stays in its language |
| Open review items               | 12 (claims, sources, evidence, revisions and reports)               |
| Decided reviews                 | approved, rejected and changes requested, with reasons              |
| Collections, bookmarks, follows | for the member, researcher and admin demo accounts                  |

The home page's example claim, the Brightwater bus lanes, is a real row in this data.

## How it is built

Most content is written straight into the tables as already-published rows. Status
changes, revisions, reviews, reports and the collection shares go through the real
workflow functions while impersonating the demo accounts. The audit log, version history,
review queue and notifications are therefore produced by the same code paths the
application uses, not copied in by hand. A final pass spreads the timestamps over past
months so the history reads like real activity. That pass pauses the audit triggers,
because moving a timestamp is bookkeeping, not an edit.

## Running it

1. Create the demo accounts: `pnpm seed:accounts`.
2. Paste `supabase/seed/demo_data.sql` into the Supabase SQL Editor and run it. The last
   result is one row of counts: 77, 110, 125, about 780 and 12.

The script is safe to run again: it first removes everything flagged `is_demo`, plus the
history that belongs to the demo accounts, and then rebuilds it. It never touches rows
created by other users.

## Tested

`pnpm test:db` loads the script twice into a scratch database and runs
`supabase/tests/seed.check.sql`, which checks the counts, that no published evidence
points at an unpublished source, that every claim's status matches the end of its history,
that revised claims keep one stored version per number, that no timestamp is in the
future, and that visitors can see only published content.
