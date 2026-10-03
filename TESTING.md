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
`Client` with `token` must store that session before the first request, so an
embedded Console client can use the documented configuration instead of
mutating the token client after construction. The browser-auth test exercises
the real request interceptor and asserts `X-Session-Token` on that first call.

The October 3, 2026 gate passed **253 tests**, followed by `npm run build`
and `git diff --check`. Five new lifecycle cases failed before repair. This
is local adapter evidence, not a hosted login or published-package check.

Prefer one parameterized test for a family of status codes or operators, and
assert the observable request/response contract rather than implementation
details such as private helper calls.
