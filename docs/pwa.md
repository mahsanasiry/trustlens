# Installable app and offline behaviour

TrustLens can be installed from the browser ("Install app" or "Add to home screen"). It
opens in its own window and shows an offline page when there is no connection.

## What is included

- `src/app/manifest.ts` serves `/manifest.webmanifest`: name, colours, and three icons
  (192 and 512 pixel regular icons, and a 512 pixel maskable icon for Android).
- `public/icons/` holds the icons, drawn from the same lens mark as the header.
  `public/favicon.ico` is a 48 pixel version for browsers that ask for it by name.
- `public/sw.js` is the service worker, registered in production builds only by
  `src/components/service-worker.tsx`.
- `public/offline.html` is shown when a page cannot be loaded. It is plain HTML with its
  own styles and picks one of the 22 languages from the browser's language list.

## What is cached, and what is not

The worker stores two things: the offline page, and files under `/_next/static/`, which
have a hash in their name and never change. It does not store pages, API responses or
anything sent with POST. Pages can contain a person's bookmarks, drafts and review work,
and an old copy of evidence is worse than a clear message that the device is offline.

The worker file itself is served with `Cache-Control: no-cache` so a new version reaches
people on their next visit. To change what is cached, change `VERSION` in `sw.js`; old
caches are removed when the new worker activates.

## Testing it by hand

Build and start the production server (`pnpm build`, then `pnpm start`), open the site,
then in the browser's developer tools go to Application, tick "Offline" and reload. The
offline page appears. The worker is intentionally not active under `pnpm dev`.

## Limits

The offline page text is a single short message translated for all languages; like the
rest of the translations it should be checked by native speakers. The manifest has one
name and description for every language.
