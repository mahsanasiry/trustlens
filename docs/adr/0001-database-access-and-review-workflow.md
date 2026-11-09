# 1. Enforce access in the database and route edits through review

Status: accepted

## Context

TrustLens publishes claims, evidence and source assessments. Researchers propose content, and admins decide what becomes public. Published content must never change without a review, no matter which client or API call is used. Private data (drafts, private collections, reports, notifications) must never leak, including through search, the public API and storage.

## Decision

Row Level Security is the source of truth for who can read and write what. The server-side checks and the interface mirror it (`src/lib/permissions`), but a mistake there can never expose data, because the database refuses the request anyway.

Anything that moves content through the workflow is a function, not a table write:

- `submit_for_review`, `propose_revision`, `claim_review_item`, `decide_review`, `change_claim_status`, `reorder_evidence` and `set_user_role` are `security definer` functions. Each one checks the caller itself, because it runs with the owner's rights.
- The workflow tables (`review_items`, `reviews`, `content_revisions`, `entity_versions`, `claim_status_changes`, `audit_logs`, `notifications`) have no insert, update or delete grant for clients. Only the functions and triggers write to them.
- Published rows are never edited by a researcher. A researcher proposes a revision, stored as a partial JSON payload against the version it was based on. Approval applies it. If the content changed in between, the approval fails instead of overwriting newer work.
- A reviewer cannot approve their own submission.
- Every published version is stored in `entity_versions`, which drives the diff view and the timeline. The audit log is written by triggers, so no code path can skip it.

Helper functions live in a `private` schema that the API does not expose.

The Organization role can be added later with a new enum value and by extending `private.is_staff` and the ownership checks in the policies. No table needs to change.

## Consequences

- The `security definer` functions are callable through the API by signed-in users, so Supabase's security advisor lists them. This is intended. Every function raises `42501` when the caller lacks the role, and the tests cover it.
- Trusted server code that uses the service role bypasses the guards on purpose. It must do its own authorization before it writes.
- Tables created in later migrations get no automatic grants for the API roles. Each migration has to grant what it needs, which keeps new tables closed by default.
- The security tests run against plain PostgreSQL with a small stand-in for the Supabase roles and `auth.uid()`. They do not run the full Supabase stack.
