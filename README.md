# TrustLens

TrustLens is an evidence transparency platform. It shows where a claim came from, which
sources support or contradict it, how those sources were assessed, and how the evidence
changed over time. **It never labels a claim true or false.** A claim's status describes
the state of the evidence ("under review", "evidence conflicts", "not enough evidence"),
and the interface is built so that nothing reads as a score or a verdict.

All content in the demo is fictional.

## What it does

- **Claims and evidence.** Each claim lists evidence that supports it, evidence that
  contradicts it and context, with limitations and a researcher's note, plus a status
  history.
- **Sources and assessments.** Sources are checked against eight published criteria
  (author transparency, citations, conflicts of interest, corrections history and so on)
  and can be compared side by side.
- **Search, bookmarks, collections.** Search covers published claims and sources.
  Readers can save items and share collections through a link.
- **A review workflow.** Researchers draft and propose changes in the Studio. Admins
  decide in a review queue. Published content never changes without a review, and nobody
  can approve their own submission.
- **Reports.** Anyone signed in can report a broken source or an error. Reports enter the
  same queue.
- **Live and installable.** Review pages refresh when something changes. The site can be
  installed as an app and shows an offline page.
- **A public API.** Read-only JSON with an OpenAPI description.
- **22 languages**, four of them right-to-left, with light and dark themes and several
  accents.

## Built with

Next.js 16 (App Router, Turbopack), React 19, TypeScript in strict mode, Tailwind CSS 4,
next-intl 4, Supabase (PostgreSQL, Auth, Row Level Security, Realtime, Storage), Zod,
Vitest and Playwright. It is set up to deploy to Cloudflare Workers through OpenNext.

## Requirements

- Node.js 22 or newer
- pnpm 11 (`corepack enable pnpm`)
- A Supabase project

## Getting started

```bash
pnpm install
cp .env.example .env.local     # fill in the Supabase values
pnpm dev
```

Open <http://localhost:3000>. The site redirects to a locale prefix such as `/en` or `/fa`.

A new Supabase project needs three things before the site shows anything:

1. The migrations in `supabase/migrations`, applied in name order. See
   [docs/database.md](docs/database.md).
2. The demo accounts: `pnpm seed:accounts` (needs `SUPABASE_SERVICE_ROLE_KEY` in
   `.env.local`; never commit it or expose it to the browser).
3. The demo content: paste `supabase/seed/demo_data.sql` into the SQL editor. See
   [docs/demo-data.md](docs/demo-data.md).

## Scripts

| Script                | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `pnpm dev`            | Start the development server                             |
| `pnpm build`          | Production build                                         |
| `pnpm lint`           | ESLint with zero warnings allowed                        |
| `pnpm format:check`   | Prettier check                                           |
| `pnpm typecheck`      | Generate route types and run the TypeScript compiler     |
| `pnpm test`           | Unit tests                                               |
| `pnpm test:e2e`       | Browser tests against a production build (see below)     |
| `pnpm test:db`        | Apply the migrations and run the security tests (`psql`) |
| `pnpm seed:accounts`  | Create the four demo accounts on the Supabase project    |
| `pnpm locales:check`  | Verify every locale for missing keys and ICU errors      |
| `pnpm locales:report` | List strings that look untranslated, per language        |
| `pnpm locales:export` | Write a review sheet (CSV) for one language              |
| `pnpm contrast:check` | Verify WCAG AA contrast of every theme and accent        |
| `pnpm verify`         | Lint, format, typecheck, locales, contrast, tests, build |
| `pnpm preview:cf`     | Build for Cloudflare and preview locally                 |
| `pnpm deploy:cf`      | Build and deploy to Cloudflare                           |

## Tests

| Kind                           | What it covers                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------- |
| Unit (`pnpm test`)             | Parameter parsing, permissions, the API serializers and OpenAPI document, PWA   |
| Database (`pnpm test:db`)      | Every migration, and row level security for each role, against plain PostgreSQL |
| End to end (`pnpm test:e2e`)   | Public pages, all 22 languages, the API, sign-in rules for each role            |
| Locales, contrast, lint, types | Run by `pnpm verify` and by the CI workflow on every push                       |

The end-to-end tests drive a production build with the demo data loaded and the demo
accounts created, so `.env.local` must point at that Supabase project.

```bash
pnpm exec playwright install chromium   # once; if the download is blocked, see docs/e2e.md
pnpm build
pnpm test:e2e
```

The GitHub workflow `End-to-end tests` runs the same thing on demand. It needs the
repository secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Project layout

```text
src/app/[locale]/   pages, one folder per route, with their server actions
src/app/api/        auth callback, health check and the public API (v1)
src/components/     interface components, grouped by feature
src/lib/data/       queries and request parsing, one module pair per feature
src/lib/api/        public API: query parsing, serializers, OpenAPI document
src/lib/i18n/       locale registry, routing and message loading
src/lib/permissions UI-side mirror of the database access rules
messages/<locale>/  interface text, one JSON file per feature
supabase/           migrations, security tests and demo seed
e2e/                Playwright tests
scripts/            checks, seeding and translation tools
docs/               one page per feature, and docs/adr for decisions
```

## Documentation

| Topic                           | Page                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Database, roles and permissions | [database.md](docs/database.md)                                                                   |
| Sign-in and demo accounts       | [auth.md](docs/auth.md)                                                                           |
| Design principles               | [design.md](docs/design.md)                                                                       |
| Claims, sources, search         | [claims.md](docs/claims.md), [sources.md](docs/sources.md), [search.md](docs/search.md)           |
| Bookmarks, collections, undo    | [bookmarks.md](docs/bookmarks.md), [collections.md](docs/collections.md), [undo.md](docs/undo.md) |
| Studio, review, reports         | [studio.md](docs/studio.md), [review.md](docs/review.md), [reports.md](docs/reports.md)           |
| Live updates and offline        | [realtime.md](docs/realtime.md), [pwa.md](docs/pwa.md)                                            |
| Profile pictures                | [storage.md](docs/storage.md)                                                                     |
| Public API                      | [api.md](docs/api.md)                                                                             |
| Translations and their review   | [translations.md](docs/translations.md)                                                           |
| Demo data                       | [demo-data.md](docs/demo-data.md)                                                                 |
| End-to-end tests                | [e2e.md](docs/e2e.md)                                                                             |
| Decisions and their reasons     | [docs/adr](docs/adr)                                                                              |

## Languages

22 languages are registered in `src/lib/i18n/locales.ts`: English, Simplified and
Traditional Chinese, Hindi, Spanish, French, Arabic, Bengali, Brazilian Portuguese,
Russian, Urdu, Indonesian, German, Japanese, Turkish, Korean, Vietnamese, Italian,
Persian, Hebrew, Polish and Dutch. Arabic, Urdu, Persian and Hebrew are right-to-left.

Only the interface is translated. Claims and sources stay in the language they were
written in and are marked with `lang`.

To add a language, add an entry to the registry and a `messages/<code>/` directory, add
its text to `public/offline.html`, and register a font module in `src/lib/fonts/` if its
script has none yet. `pnpm locales:check` reports anything missing.

## Known limits

- **The translations have not been reviewed by native speakers.** They are complete and
  checked for structure, but a reviewer must read each language before production use.
  [docs/translations.md](docs/translations.md) describes the process.
- **The content is fictional.** Organisations, people, figures and links in the demo data
  do not exist.
- **The public API has no rate limiting in the application.** Configure it at the edge
  before announcing the API.
- **Nothing works offline except the offline page.** Pages are never cached, on purpose
  ([ADR 6](docs/adr/0006-service-worker-caches-no-pages.md)).
- **Email sign-in only.** There is no social login and no organisation role yet; the
  schema leaves room for it ([ADR 1](docs/adr/0001-database-access-and-review-workflow.md)).
