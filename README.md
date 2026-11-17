# TrustLens

TrustLens is an evidence transparency platform. It shows where a claim came from, which sources support or contradict it, how those sources were assessed, and how the evidence changed over time. It does not label claims true or false.

This repository is under active construction. The sections below cover what exists today; the full documentation is written as each part lands.

## Requirements

- Node.js 22 or newer
- pnpm 11 (`corepack enable pnpm`)

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. The site redirects to a locale prefix such as `/en` or `/fa`.

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
| `pnpm verify`         | Run all of the above in order                            |
| `pnpm preview:cf`     | Build for Cloudflare and preview locally                 |
| `pnpm deploy:cf`      | Build and deploy to Cloudflare                           |

## Languages

22 languages are registered in `src/lib/i18n/locales.ts`: English, Simplified and Traditional Chinese, Hindi, Spanish, French, Arabic, Bengali, Brazilian Portuguese, Russian, Urdu, Indonesian, German, Japanese, Turkish, Korean, Vietnamese, Italian, Persian, Hebrew, Polish and Dutch.

Arabic, Urdu, Persian and Hebrew are right-to-left. Translations were written without a native-speaker review and must be reviewed before any production use. See [docs/translations.md](docs/translations.md) for how to run that review.

To add a language, add an entry to the registry and a `messages/<code>/` directory. If the language uses a script that has no module in `src/lib/fonts/` yet, add one there and register it in `src/lib/fonts/index.ts`. `pnpm locales:check` reports anything missing.

## Database

The schema, the row level security policies and the review workflow live in `supabase/migrations`. See [docs/database.md](docs/database.md) for the tables, the permission matrix and how to apply and test the migrations, and [docs/adr](docs/adr) for the reasoning behind the main decisions.

## Demo data

The interface is shown with fictional demo content. See [docs/demo-data.md](docs/demo-data.md) for what it contains and how to load it.

## Authentication

Email and password sign-in runs on Supabase Auth. Copy `.env.example` to `.env.local` and fill in the Supabase values before starting the dev server. See [docs/auth.md](docs/auth.md) for the Supabase settings, the demo accounts and the reasoning behind the session handling.

## End-to-end tests

`e2e/` holds Playwright tests for the public pages, all 22 languages, the public API and
the sign-in rules for each role. They run against a production build with the demo data
loaded and the demo accounts created (`pnpm seed:accounts`), so `.env.local` must point at
that Supabase project.

```bash
pnpm exec playwright install chromium   # once; if the download is blocked, see docs/e2e.md
pnpm build
pnpm test:e2e
```

The GitHub workflow `End-to-end tests` runs the same thing on demand. It needs the
repository secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
