# Taruvi SDK

> A TypeScript SDK for the Taruvi Platform - Backend-as-a-Service for modern applications

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)]() [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)]() [![License](https://img.shields.io/badge/license-MIT-green.svg)]()

## Overview

Taruvi SDK is a type-safe client library that enables JavaScript/TypeScript applications to interact with the Taruvi Backend-as-a-Service platform. It provides a clean, intuitive API for authentication, user management, data storage, and serverless functions.

### Key Features

- **Modern Architecture** - Dependency injection pattern, no singletons
- **Type-Safe** - Full TypeScript support with strict typing
- **Lazy Loading** - Only bundle the services you use
- **Tree-Shakeable** - Optimized for minimal bundle size
- **Testable** - Easy to mock and test with dependency injection
- **Flexible** - Support for multiple instances and configurations
- **Multi-Tenant** - Manage multiple apps under a single site

---

## Installation

```bash
npm install @taruvi/sdk
# or
yarn add @taruvi/sdk
# or
pnpm add @taruvi/sdk
```

---

## Quick Start

```typescript
import { Client, Auth, User } from '@taruvi/sdk'

// 1. Create the main client
const client = new Client({
  apiKey: 'your-site-api-key',
  appSlug: 'my-app',
  baseUrl: 'https://test-api.taruvi.cloud'
})

// 2. Initialize only the services you need
const auth = new Auth(client)
const user = new User(client)

// 3. Use the services
await auth.authenticateUser()
const userData = await user.getUserData()
console.log(userData.username)
```

---

## Core Concepts

### Dependency Injection Pattern

Taruvi SDK uses dependency injection instead of singletons, allowing multiple client instances and better testability.

```typescript
// Multiple environments
const prodClient = new Client({ apiKey: '...', appSlug: 'prod', baseUrl: '...' })
const devClient = new Client({ apiKey: '...', appSlug: 'dev', baseUrl: '...' })

// Services use the client they're given
const prodUser = new User(prodClient)
const devUser = new User(devClient)
```

### Lazy Service Instantiation

Services are manually instantiated, allowing tree-shaking to eliminate unused code.

```typescript
// Only import what you need
import { Client, User } from '@taruvi/sdk'  // ✅ Auth not bundled

const client = new Client({ /* config */ })
const user = new User(client)  // Only User service loaded
```

### Multi-Tenancy Support

Single site can manage multiple apps with isolated data using `appSlug`.

```typescript
const customerApp = new Client({
  apiKey: 'site_abc123',      // Same site
  appSlug: 'customer-portal', // Customer data
  baseUrl: 'https://test-api.taruvi.cloud'
})

const adminApp = new Client({
  apiKey: 'site_abc123',       // Same site
  appSlug: 'admin-dashboard',  // Admin data (isolated)
  baseUrl: 'https://test-api.taruvi.cloud'
})
```

---

## Services

### Auth Service

User authentication and session management.

**Status**: 🚧 60% Complete

```typescript
import { Client, Auth } from '@taruvi/sdk'

const client = new Client({ /* config */ })
const auth = new Auth(client)

// Authenticate user
await auth.authenticateUser()

// Check authentication status
const isAuth = await auth.isUserAuthenticated()  // true/false
```

#### Available Methods
- ✅ `authenticateUser()` - Login with email/password
- ✅ `isUserAuthenticated()` - Check if user has valid session
- 📋 `signInWithSSO()` - SSO authentication (planned)
- 📋 `refreshSession()` - Refresh expired token (planned)
- 📋 `signOut()` - End user session (planned)

---

### User Service

User profile and management operations.

**Status**: ✅ 80% Complete (CRUD functional)

```typescript
import { Client, User } from '@taruvi/sdk'

const client = new Client({ /* config */ })
const user = new User(client)

// Get current user
const userData = await user.getUserData()

// Create new user
const newUser = await user.createUser({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'secure123'
})

// Update user
await user.updateUser('john_doe', {
  email: 'newemail@example.com'
})

// Delete user
await user.deleteUser('john_doe')
```

#### Available Methods
- ✅ `getUserData()` - Fetch current user details
- ✅ `createUser(data)` - Create new user account
- ✅ `updateUser(username, data)` - Update user information
- ✅ `deleteUser(username)` - Delete user account

---

### Storage Service

Query builder for app-specific data tables.

**Status**: 🚧 70% Complete (Query builder working)

```typescript
import { Client, Storage } from '@taruvi/sdk'

const client = new Client({ /* config */ })
const storage = new Storage(client, {})

// Get all records from a table
const allPosts = await storage
  .from('posts')
  .execute()

// Get specific record
const post = await storage
  .from('posts')
  .get('post_123')
  .execute()
```

#### Available Methods
- ✅ `from(tableName)` - Select table (chainable)
- ✅ `get(recordId)` - Select specific record (chainable)
- ✅ `execute()` - Execute the built query
- 📋 `upload()` - File upload (planned)
- 📋 `download()` - File download (planned)
- 📋 `delete()` - Delete files (planned)

---

### Settings Service

Site configuration and settings.

**Status**: ✅ 70% Complete

```typescript
import { Client, Settings } from '@taruvi/sdk'

const client = new Client({ /* config */ })
const settings = new Settings(client)

// Fetch site configuration
const siteConfig = await settings.get()
console.log(siteConfig.site_slug)
```

---

### Database Service (Planned)

Query builder for database operations.

**Status**: 📋 Not Implemented

```typescript
import { Client, Database } from '@taruvi/sdk'

const client = new Client({ /* config */ })
const database = new Database(client)

// Planned API (not yet functional)
const users = await database
  .from('users')
  .select('*')
  .filter('age', 'gte', 18)
  .execute()
```

---

### Functions Service (Planned)

Serverless function invocation.

**Status**: 📋 Not Implemented

```typescript
import { Client, Functions } from '@taruvi/sdk'

const client = new Client({ /* config */ })
const functions = new Functions(client)

// Planned API (not yet functional)
const result = await functions.invoke('my-function', { data: 'value' })
```

---

## Configuration

### TaruviConfig Interface

```typescript
interface TaruviConfig {
  apiKey: string      // Required: Site/organization identifier
  appSlug: string     // Required: App identifier (multi-tenant)
  baseUrl: string     // Required: API endpoint URL
  token?: string      // Optional: Pre-existing session token
}
```

### Configuration Examples

#### Basic Setup
```typescript
const client = new Client({
  apiKey: 'your-site-key',
  appSlug: 'my-app',
  baseUrl: 'https://test-api.taruvi.cloud'
})
```

#### With Existing Token
```typescript
const client = new Client({
  apiKey: 'your-site-key',
  appSlug: 'my-app',
  baseUrl: 'https://test-api.taruvi.cloud',
  token: 'existing-session-token'  // Skip login
})
```

#### Multiple Environments
```typescript
const config = {
  production: {
    apiKey: process.env.PROD_API_KEY!,
    appSlug: 'prod-app',
    baseUrl: 'https://api.taruvi.cloud'
  },
  development: {
    apiKey: process.env.DEV_API_KEY!,
    appSlug: 'dev-app',
    baseUrl: 'https://dev-api.taruvi.cloud'
  }
}

const client = new Client(
  process.env.NODE_ENV === 'production'
    ? config.production
    : config.development
)
```

---

## Framework Integration

### React

Create context and custom hooks for app-wide access.

```typescript
import { createContext, useContext, ReactNode } from 'react'
import { Client, User, Auth } from '@taruvi/sdk'

// Create context
const TaruviContext = createContext<Client | null>(null)

// Provider component
export function TaruviProvider({ children }: { children: ReactNode }) {
  const client = new Client({
    apiKey: process.env.REACT_APP_TARUVI_API_KEY!,
    appSlug: process.env.REACT_APP_TARUVI_APP_SLUG!,
    baseUrl: process.env.REACT_APP_TARUVI_BASE_URL!
  })

  return (
    <TaruviContext.Provider value={client}>
      {children}
    </TaruviContext.Provider>
  )
}

// Custom hooks
export function useTaruvi() {
  const client = useContext(TaruviContext)
  if (!client) throw new Error('useTaruvi must be used within TaruviProvider')
  return client
}

export function useAuth() {
  const client = useTaruvi()
  return new Auth(client)
}

export function useUser() {
  const client = useTaruvi()
  return new User(client)
}

// Usage in component
function UserProfile() {
  const user = useUser()
  const [data, setData] = useState(null)

  useEffect(() => {
    user.getUserData().then(setData)
  }, [])

  return <div>Welcome, {data?.username}!</div>
}
```

### Vue 3

Use provide/inject with Composition API.

```typescript
import { provide, inject, InjectionKey } from 'vue'
import { Client, Auth, User } from '@taruvi/sdk'

// Create injection key
const TaruviKey: InjectionKey<Client> = Symbol('taruvi')

// Setup in main app or parent component
export function setupTaruvi() {
  const client = new Client({
    apiKey: import.meta.env.VITE_TARUVI_API_KEY,
    appSlug: import.meta.env.VITE_TARUVI_APP_SLUG,
    baseUrl: import.meta.env.VITE_TARUVI_BASE_URL
  })

  provide(TaruviKey, client)
}

// Composables
export function useTaruvi() {
  const client = inject(TaruviKey)
  if (!client) throw new Error('Taruvi not provided')
  return client
}

export function useAuth() {
  const client = useTaruvi()
  return new Auth(client)
}

export function useUser() {
  const client = useTaruvi()
  return new User(client)
}

// Usage in component
import { ref, onMounted } from 'vue'
import { useUser } from '@/composables/taruvi'

export default {
  setup() {
    const user = useUser()
    const userData = ref(null)

    onMounted(async () => {
      userData.value = await user.getUserData()
    })

    return { userData }
  }
}
```

### Vanilla JavaScript

Direct usage without framework.

```typescript
import { Client, Auth, User } from '@taruvi/sdk'

// Create client
const client = new Client({
  apiKey: 'your-key',
  appSlug: 'your-app',
  baseUrl: 'https://test-api.taruvi.cloud'
})

// Initialize services
const auth = new Auth(client)
const user = new User(client)

// Use services
async function handleLogin() {
  await auth.authenticateUser()

  if (await auth.isUserAuthenticated()) {
    const userData = await user.getUserData()
    document.getElementById('username').textContent = userData.username
  }
}

handleLogin()
```

---

## TypeScript Types

All public types are exported from the main entry point.

```typescript
import type {
  TaruviConfig,
  UserCreateRequest,
  UserResponse,
  UserDataResponse
} from '@taruvi/sdk'

// Use types in your application
const config: TaruviConfig = {
  apiKey: 'key',
  appSlug: 'app',
  baseUrl: 'https://test-api.taruvi.cloud'
}

const newUser: UserCreateRequest = {
  username: 'john_doe',
  email: 'john@example.com',
  password: 'secure123'
}
```

---

## Architecture

### Design Principles

The Taruvi SDK follows these architectural principles:

1. **Dependency Injection** - No singletons, explicit dependencies
2. **Lazy Initialization** - Create only what you need
3. **Internal API Protection** - Internal utilities marked with `@internal`
4. **Type Safety** - Full TypeScript support with strict mode
5. **Tree-Shaking** - Unused code is eliminated by bundlers

### Project Structure

```
src/
├── lib/                      # Public API (safe to use)
│   ├── auth/                 # Auth service
│   ├── user/                 # User service
│   ├── storage/              # Storage service
│   ├── settings/             # Settings service
│   ├── database/             # Database service (planned)
│   └── function/             # Functions service (planned)
│
├── lib-internal/             # Internal utilities (not public)
│   ├── http/                 # HTTP client wrapper
│   ├── token/                # Token management
│   ├── routes/               # API route definitions
│   ├── errors/               # Error handling
│   └── utils/                # Helper functions
│
├── client.ts                 # Main Client class
├── index.ts                  # Public exports
└── types.ts                  # Shared types
```

### Internal vs Public API

**Public API** (safe to use):
- `Client` - Main client class
- `Auth`, `User`, `Database`, `Storage`, `Functions` - Service clients
- `TaruviConfig` - Configuration interface
- Exported types from `index.ts`

**Internal API** (do not use directly):
- `client.httpClient` - Marked with `@internal`
- `client.tokenClient` - Marked with `@internal`
- Files in `lib-internal/` folder

> ⚠️ **Warning:** Using internal APIs may break in future versions without notice

---

## Testing

### Mocking the SDK

```typescript
import { Client, User } from '@taruvi/sdk'
import { vi, describe, it, expect } from 'vitest'

describe('User Service', () => {
  it('should fetch user data', async () => {
    // Mock HttpClient
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        username: 'testuser',
        email: 'test@example.com'
      })
    }

    // Mock Client
    const mockClient = {
      httpClient: mockHttpClient,
      getConfig: () => ({
        apiKey: 'test',
        appSlug: 'test',
        baseUrl: 'test'
      })
    } as unknown as Client

    // Test User service
    const user = new User(mockClient)
    const data = await user.getUserData()

    expect(data.username).toBe('testuser')
    expect(mockHttpClient.get).toHaveBeenCalledWith('api/users/me/')
  })
})
```

---

## Development Status

### Implementation Progress

| Service | Status | Progress | Notes |
|---------|--------|----------|-------|
| Core Infrastructure | ✅ Complete | 90% | Client, HTTP, Token management |
| User Service | ✅ Functional | 80% | CRUD operations working |
| Auth Service | 🚧 Partial | 60% | Basic auth working, SSO planned |
| Storage Service | 🚧 Partial | 70% | Query builder working |
| Settings Service | ✅ Functional | 70% | Site config fetching |
| Database Service | 📋 Planned | 0% | Not yet implemented |
| Functions Service | 📋 Planned | 0% | Not yet implemented |

### Legend
- ✅ **Complete/Functional**: Ready for production use
- 🚧 **Partial**: Core functionality works, some features pending
- 📋 **Planned**: Not yet implemented

---

## Roadmap

### v1.2 (Next Release)
- [ ] Complete Auth service (SSO, token refresh, sign out)
- [ ] Add error handling classes
- [ ] Implement token management (set, clear, expiration)
- [ ] Add PATCH HTTP method
- [ ] Add retry logic for failed requests

### v1.3 (Future)
- [ ] Database service with query builder
- [ ] Functions service for serverless invocation
- [ ] File upload/download in Storage
- [ ] Comprehensive test suite

### v2.0 (Long-term)
- [ ] Real-time subscriptions (WebSocket)
- [ ] Offline support with local caching
- [ ] Browser DevTools extension

---

## API Reference

For complete API documentation, see [adr.md](./adr.md).

For usage examples, see [USAGE_EXAMPLE.md](./USAGE_EXAMPLE.md).

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone repository
git clone https://github.com/taruvi/taruvi-sdk
cd taruvi-sdk

# Install dependencies
npm install

# Build SDK
npm run build

# Run tests (when available)
npm test
```

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Support

For questions, issues, or feature requests:
- 📧 Email: support@taruvi.io
- 🐛 Issues: [GitHub Issues](https://github.com/taruvi/taruvi-sdk/issues)
- 📖 Docs: [Documentation](https://docs.taruvi.io)

---

## Related Resources

- [Architecture Decision Record (ADR)](./adr.md) - Complete architectural documentation
- [Usage Examples](./USAGE_EXAMPLE.md) - Additional code examples
- [Taruvi Platform Docs](https://docs.taruvi.io) - Platform documentation
- [API Reference](https://api-docs.taruvi.io) - REST API documentation

---

## Acknowledgments

Inspired by:
- [Supabase JS](https://github.com/supabase/supabase-js) - Query builder pattern
- [Appwrite SDK](https://github.com/appwrite/sdk-for-web) - Service architecture
- [Stripe SDK](https://github.com/stripe/stripe-node) - Client pattern

---

**Built with ❤️ by the Taruvi Team**
