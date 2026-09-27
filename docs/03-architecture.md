# Architecture

The SDK has one configured `Client`, public service classes, and a shared
transport. Services receive the client in their constructor; they do not create
independent credential stores or Axios instances.

## Code map

| Boundary | Source | Responsibility |
| --- | --- | --- |
| Public entry point | [`src/index.ts`](../src/index.ts) | Exported clients, errors, types, and runtime enums |
| Configuration | [`src/client.ts`](../src/client.ts), [`src/types.ts`](../src/types.ts) | Validate configuration and wire the transport and token store |
| Services | [`src/lib/`](../src/lib/) | Domain operations and request builders |
| Transport | [`HttpClient.ts`](../src/lib-internal/http/HttpClient.ts) | Axios requests, credential headers, and error conversion |
| Session state | [`TokenClient.ts`](../src/lib-internal/token/TokenClient.ts), [`redirect.ts`](../src/lib-internal/token/redirect.ts) | Runtime-specific session storage and redirect capture |
| Routes | [`src/lib-internal/routes/`](../src/lib-internal/routes/) | Endpoint paths |
| Errors | [`src/lib-internal/errors/`](../src/lib-internal/errors/) | Error classes and response mapping |
| Shared utilities | [`src/utils/`](../src/utils/), [`src/version.ts`](../src/version.ts) | Query serialization, runtime detection, and client identification |

`src/lib/` contains Auth, User, Database, Storage, App, Functions, Analytics,
Secrets, Settings, and Policy. Module-specific contracts sit beside their
clients; shared configuration and response types live in `src/types.ts`.

## Configuration and credentials

`Client` requires a configuration and `apiUrl`, normalizes trailing slashes on
`apiUrl`/`deskUrl`, and defaults `authMode` to `session`. `appSlug` is required by
the TypeScript configuration type. `getConfig()` returns a shallow copy.

| Mode | Request header | Configuration |
| --- | --- | --- |
| `session` | `X-Session-Token` when a token is available | Browser storage, or `token` outside the browser |
| `apiKey` | `Authorization: Api-Key …` | Requires `apiKey`; construction rejects browser and React Native runtimes |

The request interceptor selects one SDK credential header. Session mode ignores
a leftover `apiKey`; API-key mode does not attach a session-token header.
Axios also has `withCredentials: true`, so this does not disable applicable
browser cookies. `X-Taruvi-Client` identifies the package version and runtime.

Browser sessions use `localStorage`; other runtimes hold their supplied token
in memory. In session mode, the client captures a sign-in fragment unless
`detectSessionInUrl` is false. `Auth.handleRedirect()` uses the same helper.
It removes sign-in fragment fields while preserving other fragment parameters
and the router's history state.

[`Auth`](../src/lib/auth/AuthClient.ts) separates a local `hasToken()` check from
`isUserAuthenticated(): Promise<boolean>`, which validates the session with the
server. `validateSession()` rejects on failure. Login/signup use the hosted
`deskUrl` or `apiUrl`; logout clears the local token and redirects in a browser.
Outside the browser, logout only clears the token.

## Request and error flow

Services construct an endpoint, select an HTTP method, and call the transport.
Builders delay the network request until a terminal method; see
[builder design](02-builder-pattern.md).

Pass endpoints to `HttpClient` without a leading slash: the transport adds one.
An endpoint beginning with `/` would become a protocol-relative `//…` URL and
can bypass the configured base URL. Route segments may have leading slashes;
the complete endpoint passed to the transport must not.

Database routes include `datatables/{table}/data/`. Storage paths are encoded
per segment so `/` remains a path separator; metadata updates use PATCH.
Check the service tests when changing either route convention.

The transport unwraps the Axios response to its body, preserving the Taruvi
response envelope where the endpoint returns one. Downloads request `blob`;
JSON requests use `application/json`, while `FormData` lets Axios set the
multipart boundary.

On HTTP 401, 410, or 419, the interceptor clears the session; 403 keeps it.
The error factory maps responses to SDK errors and gives billing error codes
precedence over status-only mapping. Ordinary rate limits expose parsed
`Retry-After` seconds. Transport failures without a response become
`NetworkError`. The transport does not retry automatically.

## Public API and package boundary

Only declarations exported by `src/index.ts` are supported package imports.
`Client.httpClient` and `Client.tokenClient` are marked `@internal`.
The error classes are public; `createErrorFromResponse` is an internal factory.

[`package.json`](../package.json) exports `dist/index.js` and `dist/index.d.ts`.
[`tsconfig.json`](../tsconfig.json) uses NodeNext modules and emits declarations,
source maps, and declaration maps. The package is ESM-only. `src/version.ts`
reads `package.json` using a JSON import attribute.

Axios `>=1 <2` is the only peer dependency. TypeScript and `@types/node` are
development dependencies. The package's file allowlist is `dist` and `README.md`;
npm also includes its package metadata. `docs/` is not shipped. Verify the
actual archive using the [release instructions](08-releases-and-branches.md).
