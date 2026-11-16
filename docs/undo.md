# Undo

Removing a bookmark, or an item from a collection, can be undone straight away.

The page the person returns to shows a notice ("Removed from your bookmarks.") with an
**Undo** button. Undo is a plain form, so it works without scripts, like the removal
itself. It saves the item again through the same action as the normal save.

Nothing is kept on the server to make this work. The removal sends the person back with
`?removed=<kind>.<id>` in the address, and the page reads that to offer the undo. The
notice therefore goes away as soon as the person navigates elsewhere, and anyone can
only put back something they are allowed to see: saving goes through the same access
checks as any other save.

An item put back into a collection is added at the end of the list, not at its old
position. Deleting a whole collection is not undoable; it asks for confirmation instead.
