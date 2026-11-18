# Deployment

TrustLens is a Next.js server application. It renders pages on request, reads the session
cookie and queries Supabase, so it needs a host that runs a real Node.js process. The live
demo runs on Render's free web service; see
[ADR 8](adr/0008-deploy-to-render.md) for why, and for what was tried first.

The deployed site needs only the public Supabase values. **The service-role key is not
used by the site and must never be added to the host or to GitHub.** It is only for the
local `pnpm seed:accounts` script.

## Render

1. Create a Web Service from the GitHub repository, branch `main`, instance type Free.
2. Build command:

   ```
   pnpm install --frozen-lockfile && pnpm build
   ```

3. Start command:

   ```
   pnpm start
   ```

4. Environment variables. The `NEXT_PUBLIC_` values are read at build time, so a change to
   any of them needs a new build.

   | Name                            | Value                                    |
   | ------------------------------- | ---------------------------------------- |
   | `NODE_VERSION`                  | `22`                                     |
   | `NEXT_PUBLIC_SUPABASE_URL`      | the project URL                          |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon (public) key          |
   | `NEXT_PUBLIC_SITE_URL`          | the service address, without a final `/` |

5. In Supabase, open Authentication > URL Configuration. Set the Site URL to the service
   address and add `<service address>/api/auth/callback` as a redirect URL.

Every push to `main` builds and deploys again.

The free instance stops after about fifteen minutes without traffic. The first request after
that waits for it to start, which can take close to a minute.

## Checking a deployed site

Run the public end-to-end tests against the live address:

```powershell
$env:E2E_BASE_URL = "https://your-service.onrender.com"
pnpm exec playwright test e2e/public-pages.spec.ts e2e/languages.spec.ts e2e/api.spec.ts --project=desktop --retries=2
```

On a slow or unreliable connection some requests time out. A failure that disappears on
retry is a connection problem, not an application one.

## Cloudflare Workers

The repository still carries a working OpenNext configuration for Cloudflare Workers
(`wrangler.jsonc`, `open-next.config.ts`, `public/_headers` and the manual workflow in
`.github/workflows/deploy.yml`). On the free Workers plan it does not fit: the median CPU
time per request measured about 26 ms against a limit of 10 ms, so most page requests were
stopped. The paid plan raises that limit, and the same build then applies.

Build commands for a Git-connected Worker:

```
pnpm install --frozen-lockfile && pnpm exec opennextjs-cloudflare build
pnpm exec opennextjs-cloudflare deploy
```

Static files on Workers skip Next.js headers, which is why `public/_headers` repeats them.
