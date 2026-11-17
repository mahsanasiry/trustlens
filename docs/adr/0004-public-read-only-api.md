# 4. Offer a read-only, versioned public API on the same data layer

Status: accepted

## Context

Other tools, researchers and journalists may want the published claims and sources
without scraping the site. Exposing the database directly would make every column and
policy part of a public contract.

## Decision

`/api/v1` offers four read endpoints (claims and sources, as lists and as single items)
and an OpenAPI 3.1 description. It calls the same data functions as the pages, so it
returns only published, undeleted content and nothing a visitor could not already see.
A separate serializer maps database rows to a stable camelCase shape, so a column can be
renamed without breaking clients.

Every field is always present, with `null` for a missing value. Filter values the API
does not know are rejected with `400` instead of being ignored. Errors use one shape,
`{ "error": { "code", "message" } }`, and database messages never reach the caller.

The OpenAPI document is built from the same lists of categories, statuses and source
types as the application, and a test checks that every reference resolves. See
[api.md](../api.md).

## Consequences

- The API has no keys or accounts and allows any origin. Rate limiting is not done in the
  application; it belongs at the edge and must be configured before the API is announced.
- A breaking change ships as `/api/v2` next to `v1`.
- Writing, search and personal data are deliberately not part of it.
