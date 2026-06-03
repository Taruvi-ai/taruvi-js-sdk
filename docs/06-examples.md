# Examples

Practical chaining patterns and common workflows. All examples use current API names (`apiUrl`, session auth, etc.).

**Setup** (assumed in snippets):

```typescript
import {
  Client,
  Database,
  Storage,
  Auth,
  App,
  Secrets,
} from '@taruvi/sdk'

const client = new Client({
  apiKey: 'your-site-api-key',
  appSlug: 'your-app-slug',
  apiUrl: 'https://taruvi-site.taruvi.cloud',
})
```

---

## Database — list with filters, sort, pagination, populate

```typescript
const response = await new Database(client)
  .from('accounts')
  .filters('status', 'eq', 'active')
  .filters('age', 'gte', 18)
  .orderBy('created_at', 'desc')
  .page(1)
  .pageSize(20)
  .populate(['customer', 'items'])
  .execute()

console.log(response.data, response.pagination)
```

---

## Database — CRUD

```typescript
// Create
await new Database(client)
  .from('accounts')
  .create({ name: 'Carol', status: 'active' })
  .execute()

// Read one
const row = await new Database(client)
  .from('accounts')
  .get('record-id-123')
  .execute()

// Update
await new Database(client)
  .from('accounts')
  .get('record-id-123')
  .update({ name: 'Updated Name' })
  .execute()

// Delete one
await new Database(client)
  .from('accounts')
  .delete('record-id-123')
  .execute()

// Bulk delete by IDs
await new Database(client)
  .from('accounts')
  .bulkDelete(['id-1', 'id-2'])
  .execute()

// Delete all matching filters
await new Database(client)
  .from('accounts')
  .filters('status', 'eq', 'archived')
  .deleteFiltered()
  .execute()

// Upsert (insert or update on unique fields)
await new Database(client)
  .from('accounts')
  .upsert({ email: 'user@example.com', name: 'Jane' }, ['email'])
  .execute()
```

---

## Database — shortcuts

```typescript
// First matching row (or null)
const first = await new Database(client)
  .from('accounts')
  .filters('email', 'eq', 'user@example.com')
  .first()

// Count
const total = await new Database(client)
  .from('accounts')
  .filters('status', 'eq', 'active')
  .count()
```

---

## Database — graph traversal

```typescript
// Descendants of employee 1, depth 3
await new Database(client)
  .from('employees')
  .get('1')
  .include('descendants')
  .depth(3)
  .execute()

// Ancestors only (sibling branch from same base — see below)
await new Database(client)
  .from('employees')
  .get('4')
  .include('ancestors')
  .execute()

// Graph format with relationship types
await new Database(client)
  .from('employees')
  .format('graph')
  .types(['manager', 'reports_to'])
  .execute()
```

---

## Database — edges

```typescript
// Create edges
await new Database(client)
  .from('employees')
  .edges()
  .create([
    { from_id: 5, to_id: 2, type: 'manager' },
  ])
  .execute()

// Delete edges by ID
await new Database(client)
  .from('employees')
  .edges()
  .delete([101, 102])
  .execute()
```

---

## Immutable base queries

Branch multiple queries from one `from()` without mutating shared state:

```typescript
const base = new Database(client).from('accounts')

const activeUsers = base.filters('status', 'eq', 'active')
const page2 = base.page(2)
const sortedByName = base.orderBy('name', 'asc')

await activeUsers.execute()   // ?status=active
await page2.execute()         // ?page=2
await sortedByName.execute()  // ?ordering=name
```

Multi-sort via chaining — accumulates instead of overwriting:

```typescript
const results = await new Database(client)
  .from('employees')
  .orderBy('department', 'asc')
  .orderBy('salary', 'desc')
  .execute()
// ?ordering=department,-salary
```

Aggregation with grouping and having — accumulates on chain:

```typescript
const report = await new Database(client)
  .from('orders')
  .aggregate('sum(total)', 'count(*)')
  .groupBy('status')
  .groupBy('region')
  .having('sum_total__gte=10000')
  .having('count__gt=5')
  .orderBy('sum_total', 'desc')
  .execute()
// ?_aggregate=sum(total),count(*)&_group_by=status,region&_having=sum_total__gte=10000,count__gt=5&ordering=-sum_total
```

Allowed actions — accumulates on chain:

```typescript
const data = await new Database(client)
  .from('documents')
  .allowedActions(['read', 'write'])
  .allowedActions(['delete'])
  .execute()
// ?allowed_actions=read,write,delete
```

Graph example — different traversal from same table:

```typescript
const base = new Database(client).from('employees')

const descendants = base.get('1').include('descendants').depth(3)
const ancestors = base.get('4').include('ancestors')

await descendants.execute()  // /employees/1/ ... include=descendants&depth=3
await ancestors.execute()    // /employees/4/ ... include=ancestors
```

---

## Database — JSON filter tree

```typescript
await new Database(client)
  .from('accounts')
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

---

## Storage — list, download, upload, delete

```typescript
// List PDFs in bucket
const files = await new Storage(client)
  .from('documents')
  .filter({ mimetype: 'application/pdf', page: 1, page_size: 50 })
  .execute()

// Download blob
const blob = await new Storage(client)
  .from('documents')
  .download('reports/annual.pdf')
  .execute()

// Upload
await new Storage(client)
  .from('documents')
  .upload({
    files: [fileInput.files[0]],
    paths: ['uploads/photo.jpg'],
    metadatas: [{ visibility: 'private' }],
  })
  .execute()

// Bulk delete
await new Storage(client)
  .from('documents')
  .delete(['old/a.pdf', 'old/b.pdf'])
  .execute()

// Metadata only
const meta = await new Storage(client)
  .from('documents')
  .metadata('reports/annual.pdf')
  .execute()

// Get file URL (no HTTP request)
const url = new Storage(client)
  .from('documents')
  .getUrl('reports/annual.pdf')
// → "https://your-site.taruvi.cloud/api/apps/your-app/storage/buckets/documents/objects/reports%2Fannual.pdf/"
```

### Storage — immutable filter branches

```typescript
const base = new Storage(client).from('documents')

const pdfs = base.filter({ mimetype: 'application/pdf' })
const images = base.filter({ mimetype_category: 'image' })

await pdfs.execute()
await images.execute()
```

---

## App and Secrets

```typescript
// App roles
const roles = await new App(client).roles().execute()

// App settings
const appSettings = await new App(client).settings().execute()

// Single secret (optional app context and tag validation)
const secret = await new Secrets(client)
  .get('DATABASE_URL', {
    app: 'my-app',
    tags: ['production', 'database'],
  })
  .execute()

// Batch secrets
const secrets = new Secrets(client)
const batch = await secrets.list(['KEY_A', 'KEY_B'], {
  app: 'my-app',
  includeMetadata: true,
})
```

---

## Auth

Login is **handled by the Taruvi backend** (hosted pages). The SDK redirects there and stores the `session_token` when the user returns. See [Authentication flow](01-introduction.md#authentication-flow-web-ui-flow).

```typescript
const auth = new Auth(client)

// 1. Send user to backend login (full page redirect)
auth.login()                    // optional callbackUrl — where backend sends user after login
auth.signup(window.location.href)

// 2. After redirect back, Client (created on app load) picks up #session_token from URL hash

// 3. Check session and load profile
if (auth.isUserAuthenticated()) {
  const token = auth.getSessionToken()
  const user = await auth.getCurrentUser()
}

// 4. Logout — clears local token, then backend logout redirect
await auth.logout()
```

### Server-side session

```typescript
const serverClient = new Client({
  apiKey: process.env.TARUVI_API_KEY!,
  appSlug: 'my-app',
  apiUrl: process.env.TARUVI_API_URL!,
  token: sessionTokenFromRequest,
})

const db = new Database(serverClient)
await db.from('accounts').get('123').execute()
```

---

## User, Functions, Analytics, Policy, Settings

```typescript
import { User, Functions, Analytics, Policy, Settings } from '@taruvi/sdk'

// User admin
const users = new User(client)
await users.list({
  is_active: true,
  search: 'jane',
  page: 1,
  page_size: 50,
  ordering: 'username',
})
await users.getPreferences()

// Function invocation (sync)
await new Functions(client).execute('send-welcome-email', {
  params: { userId: '123' },
  async: false,
})

// Function invocation (async — returns without waiting for completion)
await new Functions(client).execute('heavy-export', {
  params: { format: 'csv' },
  async: true,
})

// Analytics
await new Analytics(client).execute('monthly-revenue', {
  params: { year: 2026 },
})

// Policy — batch check
const check = await new Policy(client).checkResource([
  {
    resource: 'datatable:accounts',
    recordId: '123',
    actions: ['read', 'update', 'delete'],
    attributes: { department: 'sales' },
  },
  {
    resource: 'datatable:orders',
    recordId: '456',
    actions: ['read'],
    attributes: {},
  },
])
// check.results[].actions maps action → EFFECT_ALLOW | EFFECT_DENY

const allowed = await new Policy(client).getAllowedActions(
  { kind: 'datatable:accounts', id: '123', attr: {} },
  { actions: ['read', 'write', 'delete'] },
)

// Settings
await new Settings(client).get()
await new Settings(client).getUserAttributes()
```

---

## Error handling

```typescript
import { NotFoundError, AuthError } from '@taruvi/sdk'

try {
  await new Database(client).from('accounts').get('missing-id').execute()
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Record not found')
  } else if (error instanceof AuthError) {
    console.log('Not authenticated')
  }
  throw error
}
```

---

## React hook pattern (optional)

```typescript
function useTaruvi(client: Client) {
  return useMemo(
    () => ({
      db: new Database(client),
      storage: new Storage(client),
      auth: new Auth(client),
    }),
    [client],
  )
}
```

---

## Typed database rows

```typescript
interface Product {
  id: string
  name: string
  price: number
}

const product = await new Database<Product>(client)
  .from('products')
  .get('sku-001')
  .first()
```

---

## See also

- [Advanced topics & troubleshooting](07-advanced-topics.md) — filters, storage, CORS, `apiKey`
- [Builder pattern](02-builder-pattern.md) — why immutability matters
- [API reference](05-api-reference.md) — full method list
- [Clients](04-clients.md) — when to use each service
