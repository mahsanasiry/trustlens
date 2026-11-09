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
| `pnpm test:db`        | Apply the migrations and run the security tests (`psql`) |
| `pnpm locales:check`  | Verify every locale for missing keys and ICU errors      |
| `pnpm contrast:check` | Verify WCAG AA contrast of every theme and accent        |
| `pnpm verify`         | Run all of the above in order                            |
| `pnpm preview:cf`     | Build for Cloudflare and preview locally                 |
| `pnpm deploy:cf`      | Build and deploy to Cloudflare                           |

## Languages

22 languages are registered in `src/lib/i18n/locales.ts`: English, Simplified and Traditional Chinese, Hindi, Spanish, French, Arabic, Bengali, Brazilian Portuguese, Russian, Urdu, Indonesian, German, Japanese, Turkish, Korean, Vietnamese, Italian, Persian, Hebrew, Polish and Dutch.

Arabic, Urdu, Persian and Hebrew are right-to-left. Translations have not been reviewed by native speakers yet and must be before any production use.

To add a language, add an entry to the registry and a `messages/<code>/` directory. If the language uses a script that has no module in `src/lib/fonts/` yet, add one there and register it in `src/lib/fonts/index.ts`. `pnpm locales:check` reports anything missing.

## Database

The schema, the row level security policies and the review workflow live in `supabase/migrations`. See [docs/database.md](docs/database.md) for the tables, the permission matrix and how to apply and test the migrations, and [docs/adr](docs/adr) for the reasoning behind the main decisions.
