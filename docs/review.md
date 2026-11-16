# Review queue

Admins decide what gets published. The queue at `/review` lists everything that is
waiting: claims, sources, evidence, source checks, changes to published content and
reader reports. It is visible to admins only; for everyone else the page does not exist.

## How an item is decided

1. An admin opens an item and chooses **Start reviewing**. This holds the item, so two
   admins cannot decide it at once (`claim_review_item`). **Release** hands it back.
2. The admin reads the item. For a change to published content the page shows the
   published version next to the proposed one, field by field, and only the fields that
   differ.
3. The admin approves, requests changes or rejects (`decide_review`). A reason is
   required for anything but approval, and the author or reporter sees it. A report is
   accepted or dismissed instead.
4. A decided item leaves the queue. Its page still shows the decision, who made it and when.

An admin cannot approve something they submitted themselves; another admin has to.
They can still request changes or reject it.

## Where the rules live

The database enforces all of this. The pages only report what the database answered:

| Database error | Shown as                                                                   |
| -------------- | -------------------------------------------------------------------------- |
| `42501`        | no permission, including approving your own submission                     |
| `55006`        | held or already decided by someone else                                    |
| `22023`        | cannot be approved yet, for example evidence whose source is not published |

`list_review_queue` and `get_review_item` are read functions for admins. They run with
the caller's rights, so row level security still applies underneath. Both are covered by
`supabase/tests/review-queue.test.sql`.

## Applying the migration

Run `supabase/migrations/20261116000100_review_queue.sql` in the Supabase SQL editor.
