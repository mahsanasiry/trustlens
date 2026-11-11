# Authentication

Sign-in uses Supabase Auth with email and password. The session lives in cookies
managed by `@supabase/ssr`, so server components, route handlers and the browser all
see the same user.

## Where things live

| Concern                              | File                                       |
| ------------------------------------ | ------------------------------------------ |
| Environment validation               | `src/lib/supabase/env.ts`                  |
| Browser and server clients           | `src/lib/supabase/browser.ts`, `server.ts` |
| Session refresh on every request     | `src/proxy.ts`                             |
| Current user and role                | `src/lib/auth/session.ts`                  |
| Form validation (shared, translated) | `src/lib/auth/schemas.ts`                  |
| Email confirmation callback          | `src/app/api/auth/callback/route.ts`       |
| Demo accounts                        | `scripts/seed-demo-accounts.mjs`           |

## Decisions

- `getSession()` calls `auth.getUser()`, which asks the auth server to validate the
  token. It never trusts the cookie alone, so the result is safe to authorize with.
- The role comes from `public.profiles`, read through RLS. The TypeScript policy in
  `src/lib/permissions` only mirrors the database rules for the interface; the database
  is what actually enforces them.
- The proxy writes refreshed cookies to the request as well as the response, so server
  components in the same request do not try to refresh an already rotated token.
- Sign-up shows the same "check your email" message whether or not the address is
  already registered, so the form does not reveal which addresses have accounts.
- Validation messages are translation keys, so one Zod schema serves every locale.

## Supabase settings

1. Authentication > URL Configuration: set Site URL to `http://localhost:3000` and add
   `http://localhost:3000/api/auth/callback` to Redirect URLs. Add the production URL
   the same way when the site is deployed.
2. Authentication > Providers > Email: leave "Confirm email" on for production. For a
   quick local try-out you may turn it off, and sign-up then signs the user in directly.

## Demo accounts

`pnpm seed:accounts` creates four accounts (member, researcher, admin and a second
admin, because nobody can approve their own submission) with one shared, public
password. It needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. That key bypasses row
level security: keep it server-side and never commit it. The script is safe to re-run.
