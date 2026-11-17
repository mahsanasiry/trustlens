# 6. Cache the offline page and build files, never pages

Status: accepted

## Context

An installable app and an offline message improve the experience on unreliable
connections. A service worker that caches pages would also keep personal data (saved
items, drafts, review work) on the device and could show an out-of-date version of the
evidence with no sign that it is old.

## Decision

The worker stores two things only: the offline page, and files under `/_next/static/`,
whose names contain a hash and never change. Pages, API responses and anything sent with
`POST` always go to the network. When a page cannot be fetched, the offline page is
shown, in the visitor's language.

The worker file is served with `Cache-Control: no-cache` so an update reaches people on
their next visit, and it is registered in production builds only.

## Consequences

- Nothing can be read offline. The trade is intended: a stale claim page is worse than a
  clear message.
- Bumping `VERSION` in `public/sw.js` clears older caches on activation.

See [pwa.md](../pwa.md).
