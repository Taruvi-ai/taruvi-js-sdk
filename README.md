# Taruvi JavaScript SDK

Official JavaScript and TypeScript SDK for TaruviBase.

[![npm](https://img.shields.io/npm/v/@taruvi/sdk?label=npm)](https://www.npmjs.com/package/@taruvi/sdk) [![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

`@taruvi/sdk` provides shared authentication, query builders, and typed errors for
database, storage, auth, users, functions, analytics, secrets, policy, and settings.

## Install

```bash
npm install @taruvi/sdk axios@^1          # stable
npm install @taruvi/sdk@beta axios@^1     # pre-release
```

The package ships ESM and TypeScript declarations. Axios 1.x is its peer
dependency. See [package compatibility](https://docs.taruvibase.com/docs/build/javascript#package-compatibility)
for runtime requirements.

## Quickstart

For a browser app using the signed-in user's session:

```typescript
import { Client, Database } from '@taruvi/sdk'

const client = new Client({
  apiUrl: 'https://<your-site>.taruvi.cloud',
  appSlug: '<app-slug>',
})

await new Database(client)
  .from('tasks')
  .filters('done', 'eq', false)
  .sort('title', 'asc')
  .pageSize(20)
  .execute()
```

Set up [hosted sign-in](https://docs.taruvibase.com/docs/build/javascript-authentication)
before making authenticated browser requests. Server code can use
`authMode: 'apiKey'` with an `apiKey`, or act as a user with a session `token`.
Keep API keys on the server; see [server authentication](https://docs.taruvibase.com/docs/build/javascript-authentication#call-taruvibase-from-a-server).

## Services

| Client | Use it for |
|--------|------------|
| `Auth` | Hosted sign-in, sessions, the current user |
| `Database` | Records, filters, sorting, pagination, aggregations, graph edges |
| `Storage` | Objects in app storage buckets |
| `Functions` | Function invocation |
| `User` | Users, roles, app membership, preferences |
| `Policy` | Permission checks and allowed actions |
| `Secrets` | Reading one or more secrets |
| `Settings` | Site metadata and user attributes |
| `App` | App roles and settings |
| `Analytics` | Saved analytics-query execution |

Typed errors (`TaruviError`, `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `BillingError` and others) are exported from the package.

## Learn more

- [JavaScript SDK guide](https://docs.taruvibase.com/docs/build/javascript): installation, client setup, requests, responses, and errors.
- [Authentication](https://docs.taruvibase.com/docs/build/javascript-authentication): hosted sign-in, sessions, and server-rendered apps.
- [Method reference](https://docs.taruvibase.com/docs/build/javascript-reference): services, parameters, return values, and examples.
- [Product guides](https://docs.taruvibase.com/docs/products): task-based guides for each TaruviBase service.

Use the SDK version covered by each guide when following its examples.

[Documentation](https://docs.taruvibase.com/) · [Website](https://taruvibase.com/)

## Contributing

`main` publishes stable releases and `beta` publishes pre-releases. [Maintainer documentation](docs/README.md)
covers architecture, builder design, development, and releases. See [Contributing](docs/09-contributing.md)
and [Releases and branches](docs/08-releases-and-branches.md).

```bash
npm test
npm run build
```

## License

MIT, see [LICENSE](LICENSE).
