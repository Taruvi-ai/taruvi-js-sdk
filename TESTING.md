# SDK testing

The JavaScript SDK uses Vitest. Tests are intentionally split by boundary so a
fast unit run gives confidence in request construction and client behavior,
while a separately opted-in live run can validate the deployed API contract.

## Commands

```bash
npm ci                         # install the locked toolchain
npm test                       # all unit tests
npm test -- tests/unit/database # one module (Vitest path filter)
npm test -- tests/unit/http     # transport, auth, and error boundary
npm run test:types             # Functions wire and public declarations
npm run build                  # TypeScript declarations and output
```

The unit suite uses deterministic adapters and does not contact a real API.
Use `scripts/live-browse-test.ts` only when a live environment is explicitly
configured; keep credentials out of the repository and do not mix live calls
into the default `npm test` command.

## Test map

| Area | Primary tests | Contract covered |
| --- | --- | --- |
| Client and auth modes | `tests/unit/client` | config normalization, browser API-key guard, session redirect, credential exclusivity |
| Transport and errors | `tests/unit/http`, `tests/unit/errors` | Axios adapters, status mapping, retry-after, session invalidation, network failures |
| Database | `tests/unit/database` | immutable builders, encoded filters/sorts, pagination, CRUD, search/graph/bulk operations |
| Storage | `tests/unit/storage` | object paths, upload/download, metadata, browse and batch operations |
| Functions, policy, secrets, settings, app, users, analytics | matching directories | endpoint payloads and response normalization |
| Edge behavior | `tests/unit/edge-cases` | unusual values and regression cases |

Session invalidation tests run through the real Axios interceptors with a
controlled adapter. They cover current-token rejection, an older request
failing after sign-in rotates the session, an unauthenticated request finishing
after sign-in, and an API-key failure with an unrelated stored session.
`AuthError.staleSession` marks only the older-session case without exposing
credentials. Consumers can avoid redirecting a newly signed-in user while
still treating ordinary authentication failures as failures.

Browser session configuration is also a transport contract. Constructing
`Client` with `token` keeps that session in memory for that client, without
replacing the signed-in browser session shared by ordinary clients. The
browser-auth test exercises the real request interceptor, a second client, and
clear behavior while asserting `X-Session-Token` on the configured first call.

The October 3, 2026 gate passed **253 tests**, followed by `npm run build`
and `git diff --check`. Five new lifecycle cases failed before repair. This
is local adapter evidence, not a hosted login or published-package check.

Prefer one parameterized test for a family of status codes or operators, and
assert the observable request/response contract rather than implementation
details such as private helper calls.

The database transport review adds five actual Client/Axios cases. Three
reserved-character ID cases failed before path encoding was fixed; read, PATCH
and DELETE now keep the ID in its path segment without creating a query or
fragment. The other cases verify the existing flat-key replacement contract,
immutable builder reuse, and JSON tree preservation of repeated conditions and
comma-containing list values. Run `npm test -- tests/unit/database/DatabaseTransport.test.ts`.
These adapter checks do not prove a deployed backend accepts every text primary key.

## Automated gate

The reviewed CI workflow runs locked dependency installation and the module
gate on pull requests to `main` or `beta`, using Node 24 to match the release
workflow. Both CI and publication require the Function declaration probe in
addition to the existing test/build steps. This local review
did not trigger a hosted workflow or publish a package.

## Functions wire and declarations

`tests/unit/functions/FunctionsClient.test.ts` replaces mocked `HttpClient.post`
responses with the real Client/Axios pipeline over a loopback HTTP server. Five
cases cover synchronous `False`, queued acknowledgement with already-completed
metadata, default-mode omission with no retained result, synchronous `None`
normalization, and single/list invocation payload differences. These fixtures
were generated from the platform serializer and AppDataResponse using unsaved
synthetic models; no database row or live function was touched. A list omits
logs; task status belongs to nullable `task_result`, and caller fields may be null.
The JavaScript Functions module still exposes execute only.

Static declarations are checked independently with a literal wire-shaped payload:

```bash
npm run test:types
```

That probe failed against the previous caller-nullability, top-level task_status,
and acknowledgement-data declarations. It passes with the corrected exported
FunctionInvocation/FunctionTaskResult and FunctionResponse. Since `data` also
admits empty-array normalization, object consumers must narrow the value before
reading fields. The generic does not perform runtime schema validation.
