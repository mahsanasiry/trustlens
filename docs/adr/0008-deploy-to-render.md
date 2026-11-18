# 8. Deploy to Render's free web service

Status: accepted. Supersedes [7](0007-deploy-to-cloudflare-workers.md).

## Context

ADR 7 chose Cloudflare Workers. The build and deploy succeeded, but on the free Workers plan
the live site failed: the dashboard reported a median CPU time of about 26 ms per request
against a 10 ms limit, and the worker log repeated "Worker exceeded CPU time limit" for page
requests. Only responses that need almost no computation (static files, validation errors,
the OpenAPI description) passed. The paid plan lifts the limit, but it was not an option for
the maintainer. Netlify and several other hosts were also unavailable to an account in the
maintainer's country.

## Decision

Run the application as an ordinary Node.js process on Render's free web service:
`pnpm build`, then `pnpm start`. It needs no change to the application, because the code
never depended on a particular host.

## Consequences

- Pages and the public API run unchanged; the public end-to-end suite passes against the live
  address when the connection is stable.
- The free instance sleeps after about fifteen minutes without traffic, and the next request
  waits for it to wake.
- The Cloudflare configuration stays in the repository as a documented option for a paid
  Workers plan.
- Rate limiting for the public API is not in place. Add it at the host or a CDN before the
  API is announced.

See [deployment.md](../deployment.md).
