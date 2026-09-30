# Taruvi JavaScript SDK

Official JavaScript and TypeScript SDK for TaruviBase.

[![npm](https://img.shields.io/npm/v/@taruvi/sdk?label=npm)](https://www.npmjs.com/package/@taruvi/sdk) [![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Install

```bash
npm install @taruvi/sdk          # stable
npm install @taruvi/sdk@beta     # experimental
```

Peer dependencies: `axios` (>=1 <2), `typescript` (>=5.7 <6), and optionally `@types/node` (>=18 <25) for server use.

## Quickstart

Create one `Client` when your app starts, then pass it to the services you use:

```typescript
import { Auth, Client, Database } from '@taruvi/sdk'

const client = new Client({
  apiUrl: import.meta.env.VITE_TARUVI_SITE_URL,
  appSlug: import.meta.env.VITE_TARUVI_APP_SLUG,
  apiKey: 'session-authenticated-client',
})

// Call from a sign-in button; TaruviBase redirects back with a session
export const signIn = () => new Auth(client).login()

// After sign-in
const tasks = await new Database(client)
  .from('tasks')
  .filters('status', 'eq', 'open')
  .sort('title', 'asc')
  .page(1)
  .pageSize(20)
  .execute()
```

The SDK authenticates with the signed-in user's session. `apiKey` is required but not sent with requests, so use a placeholder and never put a real API key in browser code. For server use and API-key calls, see the [JavaScript SDK docs](https://docs.taruvibase.com/docs/build/javascript).

## Services

| Client | Use it for |
|--------|------------|
| `Auth` | Browser sign-in redirects, session validation, the current user |
| `Database` | Records, filters, sorting, pagination, aggregations, graph edges |
| `Storage` | Objects in app storage buckets |
| `Functions` | Function invocation |
| `User` | Users, roles, app membership, preferences |
| `Policy` | Permission checks and allowed actions |
| `Secrets` | Reading one or more secrets |
| `Settings` | Site metadata and user attributes |
| `App` | App roles and settings |
| `Analytics` | Saved analytics-query execution |

Typed errors (`TaruviError`, `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError` and others) are exported from the package.

## Learn more

[SDK docs](https://docs.taruvibase.com/docs/build/javascript) · [Documentation](https://docs.taruvibase.com/) · [Website](https://taruvibase.com/)

Guides in this repository:

| Guide | Topic |
|-------|-------|
| [Introduction](docs/01-introduction.md) | Purpose, setup, backend-handled login flow |
| [Builder pattern](docs/02-builder-pattern.md) | Immutable queries and execution |
| [Architecture](docs/03-architecture.md) | `lib` vs `lib-internal`, request flow |
| [Clients](docs/04-clients.md) | What each service does |
| [API reference](docs/05-api-reference.md) | All public methods |
| [Examples](docs/06-examples.md) | Chaining patterns and workflows |
| [Advanced & troubleshooting](docs/07-advanced-topics.md) | Typing, filters, CORS, packaging |
| [Releases & branches](docs/08-releases-and-branches.md) | Stable vs beta, CI/CD publish workflow |

## Contributing

`main` publishes stable releases and `beta` publishes experimental ones. See [Contributing](docs/09-contributing.md) and [Releases & branches](docs/08-releases-and-branches.md).

```bash
npm run build    # TypeScript compile
npm test         # Vitest unit tests
```

## License

MIT, see [LICENSE](LICENSE).
