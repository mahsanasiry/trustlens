# Saved items

Signed-in readers can save claims and sources and see them on `/bookmarks`. Visitors see a "Sign in to save" link in place of the button.

## How saving works

The button is a form that posts to the server action `setBookmark`, so it works without scripts. The action:

1. Validates the form (kind, id, intent, locale and a return path) and answers 404 to anything malformed.
2. Sends visitors to the sign-in page.
3. Inserts or deletes the row in `bookmarks` as the signed-in reader. Saving something already saved is treated as a repeat click, not an error.
4. Redirects back to the page it came from. The return path must be a path inside the site; anything else falls back to the home page.

Row-level security is the source of truth: a reader can only read, add and remove their own bookmarks, and can only bookmark something they are allowed to see. The action does not repeat those checks.

## Listing

`public.list_bookmarks(limit, offset)` returns the reader's saved items, newest first, in the same row shape as search. Items that were unpublished or deleted after being saved are left out of the list and the total, but the bookmark is kept, so the item reappears if it is published again.

If a page past the end is requested (for example after removing the last item on the final page), the page redirects to the first page.
