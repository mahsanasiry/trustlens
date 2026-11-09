# Database

The schema lives in `supabase/migrations` and is written for PostgreSQL as hosted by Supabase. Apply the files in name order.

## Tables

| Group         | Tables                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------ |
| People        | `profiles`, `user_settings`                                                                      |
| Content       | `claims`, `claim_relations`, `claim_status_changes`, `sources`, `evidence`, `source_assessments` |
| Review        | `review_items`, `reviews`, `content_revisions`, `entity_versions`, `reports`                     |
| Personal      | `collections`, `collection_items`, `collection_shares`, `bookmarks`, `follows`, `saved_views`    |
| Notifications | `notifications`                                                                                  |
| Records       | `audit_logs`                                                                                     |

A claim has many pieces of evidence, and a source can back many claims. A claim's editorial status (`unreviewed`, `under_review`, `evidence_available`, `conflicting_evidence`, `insufficient_evidence`, `archived`) describes the state of the evidence. It is separate from the publication state of the record itself.

## Publication state

Claims, sources, evidence and assessments move through `draft`, `pending_review`, `changes_requested`, `published` and `rejected`. Only `published`, undeleted rows are public. Deleting is soft: `deleted_at` is set and the row stays for the audit trail.

Editing published content goes through `propose_revision`. The proposal waits in the review queue next to new submissions and reports. Approving it applies the change, bumps `version`, and stores a snapshot in `entity_versions` with the change summary.

## Who can do what

| Action                                                 | Visitor | User | Researcher | Admin   |
| ------------------------------------------------------ | ------- | ---- | ---------- | ------- |
| Read published claims, sources, evidence, public lists | yes     | yes  | yes        | yes     |
| Bookmark, follow, keep collections and saved views     | no      | yes  | yes        | yes     |
| Report content                                         | no      | yes  | yes        | yes     |
| Create and edit drafts                                 | no      | no   | own drafts | all     |
| Submit a draft for review                              | no      | no   | own drafts | all     |
| Propose a revision to published content                | no      | no   | yes        | yes     |
| Edit published content directly                        | no      | no   | no         | yes     |
| Change a claim status (with a reason)                  | no      | no   | no         | yes     |
| Reorder evidence of a claim                            | no      | no   | own claims | yes     |
| Claim, approve or reject review items                  | no      | no   | no         | yes (a) |
| Manage roles, read the audit log                       | no      | no   | no         | yes     |

(a) An admin cannot approve their own submission. Rejections and change requests need a written reason.

Private collections, bookmarks, notifications and reports are visible to their owner only. Admins cannot read them.

## Search

Claims and sources have a generated `search_vector` (the `simple` configuration, so it works for every supported language) and trigram indexes on titles and publishers for typo tolerance. The search functions themselves arrive with the search feature.

## Applying the migrations

In the Supabase dashboard open the SQL editor and run each file from `supabase/migrations` in name order. Each run must finish without an error before the next one.

## Tests

`pnpm test:db` applies every migration to an empty scratch database named by `DATABASE_URL`, then runs the SQL suites in `supabase/tests` as the `anon` and `authenticated` roles. Each suite runs in a transaction that is rolled back. It needs the `psql` client on the path. CI runs it against a PostgreSQL service container.

Never point it at a database that holds data you care about.

## Conventions

- Every table has Row Level Security enabled and explicit grants in the grants migration. A new table gets none by default.
- A client never writes workflow tables directly. Add a function and test the denied paths.
- `supabase/tests/support/supabase_stub.sql` stands in for the parts of Supabase the migrations rely on (`auth.users`, `auth.uid()` and the API roles). It is only used by the tests.
