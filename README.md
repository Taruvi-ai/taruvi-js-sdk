# Taruvi JavaScript SDK

`@taruvi/sdk` is the TypeScript client for Taruvi applications. It provides typed clients for table data, hosted authentication, users, storage, functions, analytics, authorization, site settings, secrets, and app metadata.

The package is ESM-only and works in modern browsers and server-side JavaScript runtimes.

## Installation

```bash
# Stable release
npm install @taruvi/sdk axios typescript @types/node

# Beta release
npm install @taruvi/sdk@beta axios typescript @types/node
```

`axios`, `typescript`, and `@types/node` are peer dependencies in the current package.

## Create a client

```typescript
import { Client } from '@taruvi/sdk'

export const taruvi = new Client({
  apiKey: 'your-site-api-key',
  appSlug: 'your-app-slug',
  apiUrl: 'https://your-site.taruvi.cloud',
  deskUrl: 'https://your-site.taruvi.cloud', // optional login/logout host
})
```

Use an `apiUrl` without a trailing slash.

| Option | Required | Purpose |
| --- | --- | --- |
| `apiKey` | Yes | Required by the current `Client` constructor. It is retained in the client configuration but is not sent as an HTTP authentication header. |
| `appSlug` | Yes | Selects the app used by app-scoped data, storage, function, analytics, policy, and app routes. |
| `apiUrl` | Yes | Base URL of the tenant backend. |
| `deskUrl` | No | Host used by browser login and logout. Defaults to `apiUrl`. Signup currently uses `apiUrl`. |
| `token` | No | Existing session token for server-side use. Browser clients use the token stored in `localStorage`. |

The current SDK authenticates API calls with `X-Session-Token`. Although `apiKey` is a required configuration field, the SDK does not send it as `Authorization: Api-Key`. Do not expose a privileged server API key in browser code.

Service clients are created explicitly from the shared `Client`:

```typescript
import {
  Analytics,
  App,
  Auth,
  Database,
  Functions,
  Policy,
  Secrets,
  Settings,
  Storage,
  User,
} from '@taruvi/sdk'

const auth = new Auth(taruvi)
const db = new Database(taruvi)
const storage = new Storage(taruvi)
```

Complete [browser authentication](#browser-authentication) or provide a [server-side session token](#server-side-authentication) before calling protected APIs. A data read can be anonymous only when the backend's authorization policy explicitly allows it. The required `apiKey` constructor field does not authenticate a request.

## Database

All database operations start with `new Database(client).from(tableName)`. Builder methods are immutable, so a base query can safely be reused.

```typescript
import { Database, type TaruviResponse } from '@taruvi/sdk'

interface Account {
  id: string
  name: string
  status: 'active' | 'archived'
  created_at: string
}

const accounts = new Database(taruvi).from<Account>('accounts')

const response: TaruviResponse<Account | Account[]> = await accounts
  .filters('status', 'eq', 'active')
  .sort('created_at', 'desc')
  .page(1)
  .pageSize(20)
  .execute()

console.log(response.data)
console.log(response.total, response.pagination)
```

The backend uses `page` and `page_size` pagination and DRF-style ordering (`field` for ascending, `-field` for descending).

### CRUD

```typescript
// Create one or many rows
await accounts.create({ name: 'Acme', status: 'active' }).execute()
await accounts.create([
  { name: 'Acme', status: 'active' },
  { name: 'Globex', status: 'archived' },
]).execute()

// Read one row
const account = await accounts.get('record-id').execute()

// Update one row; get(id) supplies the record ID for PATCH
await accounts
  .get('record-id')
  .update({ status: 'archived' })
  .execute()

// Bulk update; each item must contain the fields required by the backend
await accounts.bulkUpdate([
  { id: 'first-id', status: 'active' },
  { id: 'second-id', status: 'archived' },
]).execute()

// Upsert, using name as the conflict key
await accounts
  .upsert({ name: 'Acme', status: 'active' }, ['name'])
  .execute()

// Delete one row or several rows by ID
await accounts.delete('record-id').execute()
await accounts.bulkDelete(['first-id', 'second-id']).execute()
```

Do not use the currently exported `deleteFiltered()` method. The SDK sends the ordinary list filters, while the current backend bulk-delete endpoint requires either `ids` or one JSON-encoded `filter` parameter. Use `delete(recordId)` or `bulkDelete(ids)` until that SDK/backend contract is aligned.

### Query helpers

```typescript
const firstActive = await accounts
  .filters('status', 'eq', 'active')
  .sort('created_at', 'desc')
  .first()

const activeCount = await accounts
  .filters('status', 'eq', 'active')
  .count()

const report = await new Database(taruvi)
  .from('orders')
  .aggregate('sum(total)', 'count(*)')
  .groupBy('status')
  .having('sum_total__gte=10000')
  .execute()
```

Useful query builders include:

| Method | Backend query |
| --- | --- |
| `filters(field, operator, value)` | `field=value` for `eq`, otherwise `field__operator=value` |
| `filters(tree)` | JSON `filters` query parameter for nested `and`/`or` groups |
| `sort(field, order?)` | `ordering` |
| `page(number)` / `pageSize(size)` | `page` / `page_size` |
| `populate(fields)` / `populateAll()` | `populate` |
| `fields('id,name')` | `fields` |
| `search(text)` | `search` |
| `allowedActions(actions)` | `allowed_actions` |
| `aggregate(...)`, `groupBy(...)`, `having(...)` | `_aggregate`, `_group_by`, `_having` |

For complex filters, the root is an array of logical groups:

```typescript
await accounts
  .filters([
    {
      operator: 'and',
      value: [
        { field: 'status', operator: 'eq', value: 'active' },
        { field: 'name', operator: 'contains', value: 'acme' },
      ],
    },
  ])
  .execute()
```

### Graphs and edges

```typescript
// Traverse related nodes
await new Database(taruvi)
  .from('employees')
  .get('employee-id')
  .include('descendants')
  .depth(3)
  .format('tree')
  .types(['manager'])
  .execute()

// The edges() builder uses the materialized {table}_edges DataTable.
const employeeEdges = new Database(taruvi).from('employees').edges()

await employeeEdges.create([
  { from_id: 'employee-1', to_id: 'employee-2', type: 'manager' },
]).execute()

// Use query-parameter bulk deletion for edge IDs.
await employeeEdges.bulkDelete(['edge-uuid-1', 'edge-uuid-2']).execute()
```

Do not use `employeeEdges.delete([edgeIds])`. That overload sends the IDs in a DELETE body, but the generic backend endpoint used by the builder accepts `ids` in the query string. Use `employeeEdges.bulkDelete(edgeIds)` instead.

## Browser authentication

Authentication uses Taruvi-hosted login and signup pages.

```typescript
import { Auth } from '@taruvi/sdk'

const auth = new Auth(taruvi)

// Redirect the browser to Taruvi login or signup.
auth.login(`${window.location.origin}/dashboard`)
// auth.signup(`${window.location.origin}/welcome`)
```

After a successful login, the backend redirects to the callback URL with a `session_token` in the URL fragment. Constructing `Client` on that page reads the token, stores it under `session_token` in `localStorage`, and removes the complete hash from the URL.

```typescript
const authenticated = await auth.isUserAuthenticated()

if (authenticated) {
  const profile = await auth.getCurrentUser()
  console.log(profile?.data)
}
```

- `hasToken()` checks local token presence only.
- `isUserAuthenticated()` is asynchronous and validates the token with the backend.
- `validateSession()` rejects when the backend does not accept the session.
- `getCurrentUser()` returns the standard response envelope or `null` when no token exists or the request fails.
- `logout(callbackUrl?)` clears the local token and redirects through the hosted logout page.
- Responses with HTTP `401`, `410`, or `419` clear the stored session token. HTTP `403` keeps it because the user is authenticated but not authorized.

Because the constructor removes the entire URL hash when it finds `session_token`, initialize the client before a hash router consumes that fragment and do not place unrelated callback state in the same hash.

## Server-side authentication

Pass a user's session token with `token`. Create a separate token-bearing client for each request; do not share one authenticated client across users.

```typescript
import { Client, Database } from '@taruvi/sdk'

export async function loadAccount(sessionToken: string, accountId: string) {
  const serverClient = new Client({
    apiKey: process.env.TARUVI_SITE_API_KEY!,
    appSlug: 'your-app-slug',
    apiUrl: process.env.TARUVI_API_URL!,
    token: sessionToken,
  })

  return new Database(serverClient)
    .from('accounts')
    .get(accountId)
    .execute()
}
```

The `token` option is used only outside a browser. In a browser, the SDK reads the session token from `localStorage`.

## Storage

Storage operations start with a bucket. In browsers, downloads return a `Blob`; all other operations return JSON responses.

```typescript
import {
  Storage,
  type StorageBrowseResponse,
  type StorageListResponse,
} from '@taruvi/sdk'

const documents = new Storage(taruvi).from('documents')

const files = await documents
  .filter({
    mimetype: 'application/pdf',
    page: 1,
    page_size: 50,
    ordering: '-created_at',
  })
  .execute<StorageListResponse>()

const root = await documents
  .browse({ page: 1, page_size: 50, sort: 'name', order: 'asc' })
  .execute<StorageBrowseResponse>()

const report = await documents
  .download('reports/annual.pdf')
  .execute<Blob>()

await documents.update('reports/annual.pdf', {
  visibility: 'private',
  metadata: { category: 'annual-report' },
}).execute()
```

Uploads require `File` and `FormData` support:

```typescript
await documents.upload({
  files: [file],
  paths: ['reports/annual.pdf'],
  metadatas: [{ category: 'annual-report' }],
}).execute()

await documents.delete([
  'reports/old-report.pdf',
  'reports/draft.pdf',
]).execute()
```

Other storage helpers are `metadata(path)`, `getUrl(path)`, `viewAccess(path)`, and `editAccess(path)`. The view/edit access methods are for Office files stored through the SharePoint provider. The backend wraps an access link in the normal response envelope, so use `execute<TaruviResponse<StorageAccessLinkResponse>>()` and read `response.data.url`.

Server-side binary downloads are a current compatibility gap: the SDK always asks Axios for `responseType: 'blob'`, which is browser-oriented. Do not rely on `Storage.download()` in Node until the SDK selects a Node-compatible response type such as `arraybuffer` or `stream`.

## Other services

### Users

```typescript
import { User } from '@taruvi/sdk'

const users = new User(taruvi)

const result = await users.list({
  search: 'jane',
  is_active: true,
  ordering: 'username',
  page: 1,
  page_size: 20,
})

const currentPreferences = await users.getPreferences()
await users.updatePreferences({ theme: 'dark', timezone: 'Asia/Kolkata' })
```

`User` also exposes `createUser`, `getUser`, `updateUser`, `deleteUser`, `getUserApps`, `assignRoles`, and `revokeRoles`. User-management operations require the corresponding backend permissions.

### Functions and analytics

```typescript
import { Analytics, Functions } from '@taruvi/sdk'

const invocation = await new Functions(taruvi).execute<{ queued: boolean }>(
  'send-welcome-email',
  {
    params: { userId: 'user-id' },
    async: false,
  },
)

const analytics = await new Analytics(taruvi).execute<{ total_sales: number }>(
  'sales-summary',
  { params: { year: 2026 } },
)
```

Function responses contain `status`, `message`, `data`, and `invocation`. Analytics responses use the standard Taruvi response envelope.

### Authorization

The SDK exports `Policy.checkResource(resources)` and `Policy.getAllowedActions(resource, options?)`, but the current SDK route omits the trailing slash registered by the backend. A POST redirect may not preserve the request method in every runtime. Treat these methods as a compatibility gap until `PolicyRoutes` is aligned with `/api/apps/{appSlug}/check/resources/`.

The backend also derives the principal from the authenticated user. After the route is aligned, do not pass `options.principal` to `getAllowedActions()`; explicit principal objects are rejected. `actions` and `auxData` are supported.

### Settings

```typescript
import { Settings } from '@taruvi/sdk'

interface PublicMetadata {
  domain: string
  settings: Record<string, unknown>
}

const settings = new Settings(taruvi)
const metadata = await settings.get<PublicMetadata>()
const attributes = await settings.getUserAttributes()

await settings.updateUserAttributes({
  type: 'object',
  properties: {
    department: { type: 'string' },
  },
})
```

Public metadata is available without authentication. Reading or updating the user-attribute schema is permission-controlled by the backend.

### Secrets

```typescript
import { Secrets, type SecretResponse } from '@taruvi/sdk'

const secrets = new Secrets(taruvi)

const databaseUrl = await secrets
  .get('DATABASE_URL', { app: 'your-app-slug', tags: ['production'] })
  .execute<SecretResponse>()

const batch = await secrets.list(['DATABASE_URL', 'QUEUE_URL'], {
  app: 'your-app-slug',
  includeMetadata: true,
})
```

Secret responses contain decrypted values. Retrieve them only in trusted code, request the minimum keys needed, and never log the returned payload.

### App metadata

```typescript
import { App } from '@taruvi/sdk'

const app = new App(taruvi)
const roles = await app.roles().execute()
const appSettings = await app.settings().execute()
```

## Response and error handling

Most Taruvi APIs return this envelope:

```typescript
interface TaruviResponse<T> {
  status: 'success' | 'error'
  message: string
  data: T
  total?: number
  pagination?: {
    offset: number
    limit: number
    count: number
    current_page: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
}
```

HTTP failures are mapped to exported SDK errors:

```typescript
import {
  AuthError,
  ForbiddenError,
  NotFoundError,
  TaruviError,
  ValidationError,
} from '@taruvi/sdk'

try {
  await new Database(taruvi).from('accounts').get('missing-id').execute()
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(error.errors)
  } else if (error instanceof AuthError) {
    console.error('Sign in again')
  } else if (error instanceof ForbiddenError) {
    console.error('The current user is not allowed to do that')
  } else if (error instanceof NotFoundError) {
    console.error('Record not found')
  } else if (error instanceof TaruviError) {
    console.error(error.statusCode, error.code, error.message)
  }
}
```

The package also exports `ConflictError`, `TimeoutError`, `NetworkError`, `RateLimitError`, and `ErrorCode`.

## Public API summary

| Client | Public operations |
| --- | --- |
| `Client` | `getConfig()` |
| `Database` | `from`, filters, sorting, pagination, populate, aggregation, graph/edge helpers, CRUD, `first`, `count`, `execute`; `deleteFiltered` and `edges().delete([...])` have known backend-contract gaps described above |
| `Auth` | `login`, `signup`, `logout`, `hasToken`, `isUserAuthenticated`, `validateSession`, `getSessionToken`, `getCurrentUser` |
| `Storage` | `from`, `filter`, `browse`, `upload`, `download`, `metadata`, `update`, `delete`, `getUrl`, `viewAccess`, `editAccess`, `execute` |
| `User` | User CRUD, list, app access, role assignment/revocation, preferences |
| `Functions` | `execute` |
| `Analytics` | `execute` |
| `Policy` | `checkResource`, `getAllowedActions`; current route compatibility gap described above |
| `Settings` | `get`, `getUserAttributes`, `updateUserAttributes` |
| `Secrets` | `get(...).execute()`, `list` |
| `App` | `roles().execute()`, `settings().execute()` |

All public classes, constants, and types are exported from [`src/index.ts`](src/index.ts). The TypeScript declarations are included in the published package.

## Development

```bash
npm install
npm run build
npm test
```

The repository publishes `main` as the npm `latest` tag and `beta` as the npm `beta` tag when the package version has not already been released.

Supplemental design and API notes are in [`docs/`](docs/README.md). When documentation and the installed package differ, use the installed version's TypeScript declarations and exported source contract.

## License

MIT

## Author

Curran C Doddabele · EOX Vantage
