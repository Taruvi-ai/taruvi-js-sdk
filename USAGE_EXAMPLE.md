# Taruvi SDK — Usage Example

> **Note:** For full documentation see **[docs/README.md](docs/README.md)**. This file only demonstrates dependency injection and basic setup.

## Dependency injection (no singleton)

```typescript
import { Client, Auth, User, Database, Storage } from '@taruvi/sdk'

// 1. Create the main client (you can create multiple instances)
const client = new Client({
  apiKey: 'your-site-key',
  appSlug: 'my-app',
  apiUrl: 'https://taruvi-site.taruvi.cloud',
  token: 'optional-initial-session-token', // optional, useful on the server
})

// 2. Create only the service clients you need
const auth = new Auth(client)
const user = new User(client)
const database = new Database(client)
const storage = new Storage(client)

// 3. Use the clients
if (auth.isUserAuthenticated()) {
  const currentUser = await auth.getCurrentUser()
  console.log('User:', currentUser?.data)
}

await database
  .from('accounts')
  .filters('status', 'eq', 'active')
  .execute()

// Vector + hybrid search
await database
  .from('documents')
  .vectorSearch('embedding', [0.1, 0.2, 0.3], { topk: 5, metric: 'cosine' })
  .hybrid({ strategy: 'rrf', alpha: 0.5 })
  .execute()

await storage.from('documents').filter({ page: 1 }).execute()
```

## React pattern

```typescript
// App.tsx — create once
const taruviClient = new Client({ apiKey, appSlug, apiUrl })

// Pass to components or context
<Dashboard taruviClient={taruviClient} />

// Component — construct services from client
function Dashboard({ taruviClient }: { taruviClient: Client }) {
  const db = new Database(taruviClient)
  // ...
}
```

## See also

- [docs/01-introduction.md](docs/01-introduction.md) — setup and DI in detail
- [docs/06-examples.md](docs/06-examples.md) — chaining patterns
