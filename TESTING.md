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
npm run test:types             # Functions, JSON secrets and App Settings declarations
npm run build                  # TypeScript declarations and output
```

The unit suite uses deterministic adapters and does not contact a real API.
The owned real-HTTP lane is `npm run test:live`; see the fixture contract below.
The former `scripts/live-browse-test.ts` used hardcoded development resources
and replaced SDK authentication. It was removed in favor of this reproducible
lane. The default `npm test` includes only `tests/unit/**/*.test.ts`.

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

The final October 4 default gate passed **267 tests in 19 files**, followed by
`npm run test:types`, `npm run build`, strict checks of the new test files and
`git diff --check`. This default evidence includes controlled adapters and
owned loopback transport tests; it is separate from actual platform acceptance.
The final shared owned-platform run passed **all eight JS live cases**, after
44 Python cases and before six Refine cases, in
`/tmp/taruvi-sdk-owned-all-final-oct4.log`. It exercised the final mutation
result declarations/route repair, binary roundtrip, real sessions and terminal
broker/worker output. No published package or production deployment changed.

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
workflow. Both CI and publication require the Functions, module response and
Database mutation declaration probes in addition to the existing test/build
steps. This local review did not trigger a hosted workflow or publish a package.

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


## Owned real-HTTP acceptance

Provision fresh services and resources with the platform repository's
`scripts/testing/sdk_live_acceptance.py`. It creates a private PostgreSQL/Redis/
MinIO stack, an owned tenant and verified cloud-member user, and an actual Celery
worker. It emits a `taruvi-sdk-live-fixture-v1` JSON manifest and injects the
fixture environment into the command. See that script's `--help` for invocation.
The provisioner owns service/tenant teardown; each SDK Database/Storage case
removes only its own record IDs/object paths in `finally`.

The shared manifest identifies `fixture_id` (prefixed `sdk-live-`),
`disposable: true`, `api_url`, `app_slug` and `resources`. Resources include
`user`, `other_app_slug`, `app_settings`, `other_app_settings`,
`database.table_name`, `storage.bucket_slug/prefix`, `functions.function_slug`,
`analytics.query_slug` and the synthetic Secrets inheritance fixture. The
platform provisioner and Python SDK's `tests/README.md` describe their exact
creation contract. The ownership marker is an operator assertion, not proof that
a customer site may be deleted.

For an already-running owned fixture, set `TARUVI_LIVE_FIXTURE_MANIFEST` to that
manifest's absolute path, `TARUVI_TEST_EMAIL`/`TARUVI_TEST_PASSWORD` to its
verified disposable user, and `RUN_INTEGRATION_TESTS=1`. Do not log credentials
or commit them. The manifest is authoritative for the site/app URL; no fallback
to a developer's `.env` file or hardcoded administrator account exists.

```bash
RUN_INTEGRATION_TESTS=1 npm run test:live
RUN_INTEGRATION_TESTS=1 npm run test:live -- -t 'Database'
RUN_INTEGRATION_TESTS=1 npm run test:live -- -t 'Storage'
RUN_INTEGRATION_TESTS=1 npm run test:live -- -t 'Functions'
RUN_INTEGRATION_TESTS=1 npm run test:live -- -t 'Auth|Analytics|Secrets|App Settings'
```

Both the separate Vitest config and fixture helper require the exact opt-in.
A disabled live command fails before requests; the default unit gate never
selects live files. Enabled missing/unsafe manifests, failed/malformed login,
missing resources or service failures fail the gate. No response is turned into
a skip. Setup login errors exclude response bodies and credentials.

Eight compact cases exercise real exported Client/Axios/module code: session
validation and isolated clearing, persisted Database CRUD/query/upsert and
refusals, S3 binary roundtrip/metadata/browse/partial deletion, synchronous and
queued Functions, bound internal Analytics SQL, JSON Secret inheritance/batch
metadata, and two App Settings scopes. Function acknowledgement alone does not
pass: bounded polling checks actual terminal worker output using the platform
result endpoint. That endpoint is accessed through the SDK's generic internal
HTTP client because the exported Functions module exposes execute only; the
lane does not claim a public task-result method.

The live lane uses Node 24, matching the reviewed CI toolchain. It validates the
current source branch against its matching backend fixture; it does not certify
the published stable package, hosted login redirects, browser UI, SharePoint or
third-party payment providers. Cerbos policy acceptance has its separate platform
gate. The complete unit gate still checks all exported module boundaries.

## Binary and declaration regressions

`tests/unit/storage/StorageBinaryTransport.test.ts` uses an actual loopback HTTP
server and Axios Node adapter. Its two cases failed before repair: the download
returned a UTF-8 string and corrupted arbitrary bytes, and a JSON refusal lost
its message/detail. Node now requests an arraybuffer and returns an unchanged
Blob with its MIME type; the existing browser Blob path remains intact. Binary
error responses are decoded as JSON before the existing typed error mapper.
This follows [Axios's response-type contract](https://axios-http.com/docs/req_config):
`blob` is browser-specific in its HTTP adapter.

The current platform `AppSettingSerializer` returns `icon_background_color` and
`default_frontend_worker_slug`, and no banner fields. The source declarations
now match that response. Secret batch values also preserve JSON objects instead
of declaring every value as a string; metadata includes its sensitivity tier.
`tests/typing/module-contracts.ts` is required by `npm run test:types`. Its actual
serializer-shaped values produced three errors against the previous declarations.
These are unreleased source corrections; no package version or release changed.

[Vitest's separate-config documentation](https://vitest.dev/config/) explains
why the live lane has its own include pattern and timeouts.

The first owned HTTP run passed five JS lifecycles and exposed three stale test
assumptions. Upsert preserves the platform `data.records/count` envelope;
partial deletion includes `data.message`; and a missing Analytics parameter
returns HTTP 400 with `code=BAD_REQUEST` and the compiler's fix instruction.
The JS error mapper deliberately reserves `ValidationError` for
`VALIDATION_ERROR`, so that refusal is a `TaruviError`. The repaired acceptance
assertions check those exact contracts and persisted upsert identity rather
than normalizing the wire response or accepting arbitrary errors.

## Mutation result inference

`upsert()` and `bulkUpdate()` return `DatabaseMutationData<Row>` inside the
normal Taruvi envelope: `{ records: Row[], count: number }`. The builder carries
a separate result mode so those writes do not pollute ordinary read inference.
Operation-preserving graph clones retain both their result type and the existing
upsert route flag; the route regression failed before repair. Query setters
that already reset an operation to a read keep that behavior. Build the query
first and select the write operation last, then call `execute()`.

```typescript
import { Client, Database } from '@taruvi/sdk'

interface Person { id: number; name: string; email: string }
const people = new Database(client).from<Person>('people')
const upsert = await people.upsert({ name: 'Ada', email: 'ada@example.invalid' }, ['email']).execute()
const changed: Person[] = upsert.data.records
const changedCount: number = upsert.data.count
const bulk = await people.bulkUpdate([{ id: changed[0]!.id, name: 'Ada Lovelace' }]).execute()
const first: Person | null = await people.first()
const total: number = await people.count()
```

Here `client` is a configured, authenticated Client. `first()` and `count()`
retain their row-returning builder binding and are unavailable after `upsert()`
or `bulkUpdate()`; consume those operations'
`data.records` and `data.count` instead. This is a declaration correction for
the current source branch and does not normalize or otherwise alter the wire
envelope. Ordinary columns named `records` or `count` remain ordinary row fields
on reads. `tests/typing/database-mutations.ts` proves read/write inference,
operation-preserving clones and rejection of direct row access or row helpers
on upsert/bulk-update results, including the default open record type. It is required in the
existing declaration gate.
