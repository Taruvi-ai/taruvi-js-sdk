# Taruvi SDK - Usage Example

## New Pattern: Dependency Injection (No Singleton)

### Basic Usage

```typescript
import { Client, Auth, User, Database } from '@taruvi/sdk'

// 1. Create the main client (can create multiple instances)
const client = new Client({
  apiKey: 'your-site-key',
  appSlug: 'my-app',
  baseUrl: 'https://api.taruvi.com',
  token: 'optional-initial-token' // optional
})

// 2. Create only the clients you need (lazy initialization)
const auth = new Auth(client)
const user = new User(client)
const database = new Database(client)

// 3. Use the clients
if (auth.isUserAuthenticated()) {
  console.log('User is authenticated')
}

const token = auth.signInWithSSO()
console.log('Token:', token)

const userDetails = user.getUser()
console.log('User:', userDetails)

// Access token via User
console.log('Current token:', user.token)
```

### Multiple Instances

You can now create multiple instances for different environments or configs:

```typescript
const prodClient = new Client({
  apiKey: 'prod-key',
    appSlug: 'main-app',
  baseUrl: 'https://api.taruvi.com'
})

const devClient = new Client({
  apiKey: 'dev-key',
    appSlug: 'dev-app',
  baseUrl: 'https://dev-api.taruvi.com'
})

const prodAuth = new Auth(prodClient)
const devAuth = new Auth(devClient)
```

### Benefits

✅ **No singleton** - Multiple instances possible
✅ **Lazy initialization** - Only create clients you need
✅ **Better testability** - Easy to mock and test
✅ **Explicit dependencies** - Clear what each client needs
✅ **No global state** - No hidden global `taruvi` variable
✅ **Tree-shakable** - Only bundle what you use

### Internal Architecture

The `taruvi` variable is no longer exported. Internal clients like `httpClient` and `tokenClient` are accessible only within the SDK through the `Client` instance passed to each client.

```typescript
// Inside Auth
export class Auth {
  private client: Client

  constructor(client: Client) {
    this.client = client
  }

  isUserAuthenticated(): boolean {
    // Access internal tokenClient through the client instance
    return !!this.client.tokenClient.getToken()
  }
}
```
