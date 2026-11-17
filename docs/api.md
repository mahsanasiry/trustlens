# Public API

A read-only JSON API over the published claims, evidence and sources. It needs no key,
allows requests from any origin, and never returns drafts or anything awaiting review.

Base path: `/api/v1`. The machine-readable description is served at
`/api/v1/openapi.json` (OpenAPI 3.1). It is built from the same lists of categories,
statuses and source types the site uses, so the two cannot drift apart.

| Endpoint            | Returns                                                         |
| ------------------- | --------------------------------------------------------------- |
| `GET /claims`       | A page of claims. Filters: `category`, `status`, `page`.        |
| `GET /claims/{id}`  | One claim with its evidence, status history and related claims. |
| `GET /sources`      | A page of sources. Filters: `type`, `page`.                     |
| `GET /sources/{id}` | One source with its assessments and the claims citing it.       |

## Shape

Lists answer `{ "data": [...], "meta": { page, pageSize, total, pageCount } }` and single
items answer `{ "data": {...} }`. Field names are camelCase. Every field is always
present; a missing value is `null`. `pageUrl` is the address of the item on the website.

A claim's `status` says where the evidence stands (`under_review`, `evidence_available`,
`conflicting_evidence`, and so on). It is not a verdict, and no endpoint returns one.

## Errors

```json
{ "error": { "code": "invalid_request", "message": "\"category\" must be one of: ..." } }
```

| Status | Code              | When                                                         |
| ------ | ----------------- | ------------------------------------------------------------ |
| 400    | `invalid_request` | A filter or `page` has an unsupported value.                 |
| 404    | `not_found`       | No published item has that id, or the id is not a valid one. |
| 500    | `internal_error`  | Anything else. The detail is logged on the server only.      |

The website drops a filter it does not recognise so an old link still shows a list. The
API rejects it instead, so a mistyped value is noticed rather than silently ignored.

## Caching and limits

Successful responses carry `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`;
errors are never cached. The application does not rate limit. Put a rate-limiting rule on
`/api/*` at the edge (Cloudflare) before announcing the API publicly.

## Out of scope

Writing, search and user data (bookmarks, collections, reports) are not part of the API.
Versioning is by path; a breaking change would ship as `/api/v2` and leave `v1` running.
