# End-to-end tests

The tests in `e2e/` drive a real browser against a production build that uses the demo
data. See the README for the short version.

## Setup

1. `pnpm add -D @playwright/test` (once).
2. A browser. Either download Playwright's own: `pnpm exec playwright install chromium`, or
   use one already on the machine.
3. `pnpm seed:accounts` and the demo data from `supabase/seed/demo_data.sql`, as described
   in [demo-data.md](demo-data.md), so the sign-in tests have accounts.

## When the browser download is blocked

Playwright downloads Chromium from `cdn.playwright.dev`, which refuses some regions with
a 403 error. Use the browser that is already installed instead:

```powershell
$env:E2E_BROWSER_CHANNEL = "msedge"   # or "chrome"
pnpm test:e2e
```

Microsoft Edge ships with Windows. The setting only affects which browser is launched.

## Running

```bash
pnpm build
pnpm test:e2e                      # everything
pnpm test:e2e e2e/api.spec.ts      # one file
pnpm exec playwright show-report   # after a failure
```

The config starts `pnpm start` itself, or reuses a server already listening on the port.
One test saves a claim for the demo member and removes it again; if a run is interrupted
the next run cleans up first.
