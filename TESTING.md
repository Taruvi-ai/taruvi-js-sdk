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

Prefer one parameterized test for a family of status codes or operators, and
assert the observable request/response contract rather than implementation
details such as private helper calls.
