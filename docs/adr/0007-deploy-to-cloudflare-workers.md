# 7. Deploy to Cloudflare Workers from GitHub Actions

Status: superseded by [8](0008-deploy-to-render.md). The Cloudflare configuration it
describes has since been removed from the repository.

## Context

The application renders every page on request, reads cookies for the session and talks to
Supabase over HTTPS. It needs a host that runs Next.js server rendering without a
long-lived server. Netlify and Cloudflare both qualify.

## Decision

Cloudflare Workers through OpenNext. The project already carries its configuration
(`wrangler.jsonc`, `open-next.config.ts`), the free plan covers a demo, and the maintainer
has an existing Cloudflare account. Netlify's published terms exclude residents of
sanctioned countries, which would put the maintainer's account at risk of suspension.

The build runs in GitHub Actions on Linux, not on a developer machine: the Cloudflare build
tool does not support Windows, and a pipeline gives every deploy the same inputs. After
publishing, the workflow runs the public end-to-end tests against the live address.

Only public values reach the deployed site. The Supabase service-role key is used by a
local seeding script and is never given to the host or the pipeline.

## Consequences

- A deploy is a manual run of the workflow (a push trigger can be added once the settings
  exist), and each one is checked against the live address.
- The free plan limits the Worker to 3 MiB compressed. If the application outgrows it, the
  paid plan raises the limit to 10 MiB.
- Static files bypass Next.js headers, so `public/_headers` repeats them.
- Nothing in the application is specific to Cloudflare. Moving to another host means
  replacing the workflow and `wrangler.jsonc`.

See [deployment.md](../deployment.md).
