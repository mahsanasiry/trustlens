# Collections

A collection is a titled, ordered list of claims and sources that a signed-in reader owns. It can be private or shared by link.

## Who can do what

|                                            | Owner | Anyone with the link | Everyone else |
| ------------------------------------------ | ----- | -------------------- | ------------- |
| Open the manage page (`/collections/[id]`) | yes   | no                   | no            |
| Read through the link (`/c/[token]`)       | yes   | yes (unlisted only)  | no            |
| Add, remove, reorder, edit, delete         | yes   | no                   | no            |

Row-level security enforces the ownership rules. The manage page also answers 404 to anyone but the owner, even for a collection that is readable by others, because it is a page for editing.

## Visibility

- **Only me** (`private`): no link works.
- **Anyone with the link** (`unlisted`): `/c/<share_token>` opens a read-only page. The token is a random UUID, so the link cannot be guessed. It is not indexed by search engines.

The database also has a `public` value. Nothing lists public collections yet, so the forms cannot set it; it is reserved for a discovery page.

## What a collection shows

Only items that are currently published are listed or counted, both to the owner and through the link, so the two always agree. An item that is unpublished or deleted after being added stays in the collection and comes back if it is published again.

## How it works

Every control is a form posting to a server action, so everything works without scripts. A form the page did not produce (a missing field, an unknown id) gets a 404.

Database functions do the parts that need to be consistent:

- `add_collection_item` appends at the end and ignores a repeat. It updates the collection row first, which proves ownership and serialises concurrent additions.
- `move_collection_item` swaps an item with its neighbour among the listed items and renumbers them 1..n.
- `list_my_collections`, `list_collection_items`, `get_shared_collection_summary` and `list_shared_collection_items` return rows with the total, so a page needs one query.

## Not built yet

- Sharing with specific people (`collection_shares` exists in the database).
- Regenerating a share link.
- A public discovery page.
