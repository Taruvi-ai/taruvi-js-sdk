# Taruvi SDK

TypeScript SDK for the Taruvi platform. It gives developers a **consistent, typed way to query the Taruvi backend** — shared configuration, session authentication, fluent query builders, and structured errors across data, storage, auth, users, functions, analytics, policy, secrets, and app services.

**Package:** `@taruvi/sdk` · **Version:** 1.5.0-beta.1 · **License:** MIT

**Branches:** `main` is for **stable** releases; `beta` is for **experimental** releases. Bumping `version` in `package.json` and pushing to either branch triggers CI/CD (`npm test`, then publish to npm with the matching tag). See [Releases and branches](docs/08-releases-and-branches.md).

## Installation

```bash
# Stable (from main)
npm install @taruvi/sdk

# Experimental (from beta)
npm install @taruvi/sdk@beta
```

**Peer dependencies:** `axios` (>=1), `typescript` (>=5.7), optional `@types/node` for server use.

## Quick start

```typescript
import { Client, Database } from '@taruvi/sdk'

const client = new Client({
  apiKey: 'your-site-api-key',
  appSlug: 'your-app-slug',
  apiUrl: 'https://taruvi-site.taruvi.cloud',
})

const db = new Database(client)

const response = await db
  .from('accounts')
  .filters('status', 'eq', 'active')
  .sort('created_at', 'desc')
  .page(1)
  .pageSize(20)
  .execute()
```

## Documentation

Full guides live in **[docs/](docs/README.md)**:

| Guide | Topic |
|-------|--------|
| [Introduction](docs/01-introduction.md) | Purpose, setup, DI, backend-handled login flow |
| [Builder pattern](docs/02-builder-pattern.md) | Immutable queries and execution |
| [Architecture](docs/03-architecture.md) | `lib` vs `lib-internal`, request flow |
| [Clients](docs/04-clients.md) | What each service does |
| [API reference](docs/05-api-reference.md) | All public methods |
| [Examples](docs/06-examples.md) | Chaining patterns and workflows |
| [Advanced & troubleshooting](docs/07-advanced-topics.md) | Typing, filters, CORS, packaging |
| [Releases & branches](docs/08-releases-and-branches.md) | Stable vs beta, CI/CD publish workflow |

## Services at a glance

| Client | Use for |
|--------|---------|
| `Database` | Table CRUD, filters, pagination, graph/edges, vector/hybrid search |
| `Storage` | Bucket files: list, upload, download, delete |
| `Auth` | Browser login/signup/logout, session token |
| `User` | User admin, roles, preferences |
| `Functions` | Invoke serverless functions |
| `Analytics` | Run predefined analytics queries |
| `Settings` | Site metadata, user attribute schema |
| `Secrets` | Read secret values |
| `Policy` | Permission checks |
| `App` | App roles and settings |

## What's included

- **Immutable builder pattern** for `Database`, `Storage`, `App`, and `Secrets.get()` — each chain step returns a new instance so parallel queries never overwrite each other's URLs or filters.
- **Session authentication** via `X-Session-Token`; automatic token extraction from URL hash after OAuth redirect in the browser.
- **Typed errors** — `AuthError`, `NotFoundError`, `ValidationError`, and others exported from the package.
- **Vector & hybrid search** — `Database.vectorSearch()` / `.hybrid()` emit the same query params as the Python SDK (`field__vector_near`, `_topk`, `_hybrid_*`).
- **Storage uploads** accept `UploadData` (`File | Blob | Buffer | Uint8Array`) for browser and Node.

## Development

```bash
npm run build    # TypeScript compile
npm test         # Vitest unit tests
```

## Additional resources

- [SDK design context](SDK_DESIGN_CONTEXT.md) — backend API contract notes (SDK ↔ API mapping)

## Author

Curran C Doddabele · EOX Vantage
