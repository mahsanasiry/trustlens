# 2. Build interactions on plain forms and server actions

Status: accepted

## Context

Most of the product is reading: lists, filters, search, claim pages. The writing that
exists (saving, collections, the studio, review decisions, reports) is a handful of
short forms. The audience includes people on slow connections and older devices, and
the site is available in 22 languages, so every extra kilobyte of script is paid for
by someone.

## Decision

Filters, search, paging and comparison are plain `GET` forms and links, so every result
has a shareable address. Saving, removing, reporting and reviewing are `POST` forms
bound to server actions. Both work before any script has loaded, and client code only
adds feedback on top (pending states, toasts, form echo).

Server actions return a small state object and, on a failed save, echo the submitted
values back so nothing the person typed is lost. A successful change redirects to the
page it came from.

Undo is stateless. Removing a bookmark or a collection item returns to the page with
`?removed=<kind>.<id>` and the page offers a form that saves the item again through the
same action. Nothing is kept on the server for it, and the same access checks apply as
for any other save. See [undo.md](../undo.md).

There is no client-side data cache or global state library.

## Consequences

- Pages are server-rendered on every request, so they always show current data and
  respect the signed-in person's permissions without a second round trip.
- A feature that needs live state (typing, dragging) has to justify its script. So far
  none has.
- Redo and draft autosave were left out on purpose: both need server-side state that
  the rest of the design avoids.
