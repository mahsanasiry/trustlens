# Deployment

TrustLens runs on Cloudflare Workers, built with OpenNext. Running the **Deploy**
workflow builds and publishes it from GitHub Actions (`.github/workflows/deploy.yml`). The build runs on Linux
because the Cloudflare build tool does not support Windows.

The deployed site needs only the public Supabase values. **The service-role key is not
used by the site and must never be added to Cloudflare or to GitHub.** It is only for the
local `pnpm seed:accounts` script.

## One-time setup

1. **Cloudflare account id.** In the dashboard, open Workers & Pages. The account id is on
   the right-hand side of the overview page.
2. **A workers.dev address.** The same page shows your workers.dev subdomain. If none has
   been registered yet, register one there once. The site will be at
   `https://trustlens.<subdomain>.workers.dev`.
3. **An API token.** My Profile > API Tokens > Create Token > the "Edit Cloudflare Workers"
   template. Limit it to your account. Copy the token once; it is not shown again.
4. **GitHub secrets and variable.** In the repository, Settings > Secrets and variables >
   Actions:

   | Kind     | Name                            | Value                                 |
   | -------- | ------------------------------- | ------------------------------------- |
   | Secret   | `CLOUDFLARE_API_TOKEN`          | the token from step 3                 |
   | Secret   | `CLOUDFLARE_ACCOUNT_ID`         | the id from step 1                    |
   | Secret   | `NEXT_PUBLIC_SUPABASE_URL`      | the project URL                       |
   | Secret   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon (public) key       |
   | Variable | `SITE_URL`                      | the site address, without a final `/` |

   The Supabase values and `SITE_URL` are compiled into the code at build time, so
   changing one means running the workflow again.

5. **Supabase sign-in addresses.** Authentication > URL Configuration: set Site URL to the
   same `SITE_URL` and add `<SITE_URL>/api/auth/callback` to Redirect URLs. Without this,
   email confirmation links point at the wrong place.

## Deploying

Open the repository's Actions tab, choose **Deploy** and run the workflow. The workflow stops at once, naming what is missing, if a setting from step 4 is
empty. Otherwise it:

1. installs the dependencies from the lockfile and builds with `pnpm build:cf`,
2. publishes with `opennextjs-cloudflare deploy`,
3. waits until `/api/health` answers,
4. runs the public-page, language and API end-to-end tests against the live address.

The sign-in tests are not part of this run. Run them yourself against the live site with
`E2E_BASE_URL=<SITE_URL> pnpm test:e2e` if you want that coverage; they save and remove one
bookmark for the demo member.

To deploy on every push to `main` instead, add the `push` trigger described in the comment
at the top of the workflow file, once a manual run has succeeded.

## Static file headers

Cloudflare serves files from `public/` without going through Next.js, so the headers set
in `next.config.ts` do not reach them. `public/_headers` repeats the security headers,
caches the hashed build files for a year and keeps the service worker uncached. A unit
test checks that the two lists agree.

## Things to know

- **Worker size.** The free plan accepts a Worker of up to 3 MiB compressed. If the deploy
  step fails with a size error, the paid plan (10 MiB) is the simple fix.
- **Rate limiting.** The public API has none in the application. Add a rate-limiting rule
  for `/api/*` in the Cloudflare dashboard before announcing it.
- **Rolling back.** Re-run the workflow on an earlier commit (Run workflow > choose the
  branch or tag), or use the Deployments view of the Worker in the dashboard.
- **Custom domain.** Add it under the Worker's Settings > Domains & Routes, then change
  `SITE_URL`, the Supabase sign-in addresses, and run the workflow again.
- **Local preview.** `pnpm preview:cf` builds and runs the Worker locally. It needs
  Linux, macOS or WSL.
