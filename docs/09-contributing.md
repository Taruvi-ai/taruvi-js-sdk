# Contributing

## Setup

```bash
git clone <repo>
cd taruvi-sdk
npm install
npm run build   # TypeScript → dist/
npm test        # Vitest unit tests
```

## Project structure

```
src/
├── index.ts                  # Public exports (everything consumers can import)
├── client.ts                 # Root Client class (config, token, http wiring)
├── types.ts                  # Shared types (TaruviConfig, TaruviResponse, filters)
├── utils/                    # Shared utilities (buildQueryString, etc.)
├── lib/                      # Public service clients
│   ├── database/             # Database (builder)
│   ├── storage/              # Storage (builder)
│   ├── app/                  # App (builder)
│   ├── secrets/              # Secrets (builder for .get(), direct for .list())
│   ├── auth/                 # Auth (direct, browser-oriented)
│   ├── users/                # User (direct)
│   ├── functions/            # Functions (direct)
│   ├── analytics/            # Analytics (direct)
│   ├── settings/             # Settings (direct)
│   └── policy/               # Policy (direct)
└── lib-internal/             # SDK internals (not for app code)
    ├── http/                 # HttpClient (Axios wrapper, auth headers, error mapping)
    ├── token/                # TokenClient (session token storage)
    ├── routes/               # URL route builders per service
    └── errors/               # Typed error classes
```

## Adding a new service client

1. Create `src/lib/<name>/` with `<Name>Client.ts` and `types.ts`
2. Add route builder in `src/lib-internal/routes/<Name>Routes.ts`
3. Export the client and types from `src/index.ts`
4. Add tests in `tests/unit/<name>/`
5. Document in `docs/04-clients.md` and `docs/05-api-reference.md`

## Adding a method to an existing builder

For builder clients (`Database`, `Storage`, `App`, `Secrets.get()`):

- Return `new ClassName(...)` with spread of existing state + your change
- If the param is comma-separated and chaining should accumulate (like `orderBy`, `aggregate`), append to existing value instead of replacing
- If the param replaces on each call (like `page`, `search`), overwrite directly

## Conventions

- **Immutable builders** — every chain method returns a new instance, never mutates `this`
- **No leading slash** on route strings — `HttpClient` prepends `/` automatically
- **Types** — each module has its own `types.ts`; shared types go in `src/types.ts`
- **Errors** — use typed errors from `lib-internal/errors/`; `HttpClient` maps HTTP status codes automatically
- **Peer deps** — `axios` and `typescript` are peers, not bundled

## Tests

Tests live in `tests/unit/<module>/` and use Vitest. Pattern:

- Mock `client.httpClient` methods (`get`, `post`, `patch`, `delete`)
- Call the builder chain → `.execute()`
- Assert the URL and body passed to the mock

Run:
```bash
npm test              # single run
npm run test:watch    # watch mode
```

## Build output

`tsc` compiles to `dist/` as ESM (`.js` + `.d.ts`). The package is ESM-only (`"type": "module"`).

## Branching

- `main` — stable releases
- `beta` — experimental releases

Bumping `version` in `package.json` and pushing triggers CI/CD publish. See [Releases & branches](08-releases-and-branches.md).
