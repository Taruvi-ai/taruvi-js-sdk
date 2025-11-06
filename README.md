# Taruvi SDK

> A TypeScript SDK for the Taruvi Platform - Backend-as-a-Service for modern applications

## Features

- **Modern Architecture** - Dependency injection pattern, no singletons
- **Type-Safe** - Full TypeScript support with strict typing
- **Lazy Loading** - Only bundle the services you use
- **Tree-Shakable** - Optimized for minimal bundle size
- **Testable** - Easy to mock and test with dependency injection
- **Flexible** - Support for multiple instances and configurations
- **Modern Architecture** - Dependency injection pattern, no singletons
- **Type-Safe** - Full TypeScript support with strict typing
- **Lazy Loading** - Only bundle the services you use
- **Tree-Shakable** - Optimized for minimal bundle size
- **Testable** - Easy to mock and test with dependency injection
- **Flexible** - Support for multiple instances and configurations

## Installation

```bash
npm install @taruvi/sdk
```

## Quick Start

```typescript
import { Client, Auth, User, Database } from '@taruvi/sdk'

// 1. Create the main client
const client = new Client({
  apiKey: 'your-site-api-key',
  appSlug: 'my-app',
  baseUrl: 'https://api.taruvi.com'
})

// 2. Initialize only the services you need
const auth = new Auth(client)
const user = new User(client)
const database = new Database(client)

// 3. Use the services
// (Implementation coming soon)
```

## Services

The Taruvi SDK provides the following service clients:

### Auth

Authentication and session management

- SSO authentication
- Password authentication
- Session management
- Token refresh

```typescript
import { Client, Auth } from '@taruvi/sdk'

const client = new Client({ apiKey: '...', appSlug: '...', baseUrl: '...' })
const auth = new Auth(client)

// TODO: Methods will be implemented
```

### User

User profile and management

- Get user details
- Update user profile
- Manage user data

```typescript
import { Client, User } from '@taruvi/sdk'

const client = new Client({ apiKey: '...', appSlug: '...', baseUrl: '...' })
const user = new User(client)

// TODO: Methods will be implemented
```

### Database

Database operations with query builder

- CRUD operations
- Query filtering
- Sorting and pagination
- Transactions

```typescript
import { Client, Database } from '@taruvi/sdk'

const client = new Client({ apiKey: '...', appSlug: '...', baseUrl: '...' })
const database = new Database(client)

// TODO: Methods will be implemented
```

### Storage

File storage and management

- Upload files
- Download files
- Delete files
- List files

```typescript
import { Client, Storage } from '@taruvi/sdk'

const client = new Client({ apiKey: '...', appSlug: '...', baseUrl: '...' })
const storage = new Storage(client)

// TODO: Methods will be implemented
```

### Functions

Edge functions (serverless)

- Invoke functions
- Stream responses
- Get function logs
- List functions

```typescript
import { Client, Functions } from '@taruvi/sdk'

const client = new Client({ apiKey: '...', appSlug: '...', baseUrl: '...' })
const functions = new Functions(client)

// TODO: Methods will be implemented
```

## Configuration

### Basic Configuration

```typescript
import { Client } from '@taruvi/sdk'

const client = new Client({
  apiKey: 'your-site-key',               // Required: Site API key
  appSlug: 'my-app',                     // Required: App identifier
  baseUrl: 'https://api.taruvi.com',     // Required: API base URL
  token: 'optional-token'                // Optional: Pre-existing auth token
})
```

### TypeScript Types

```typescript
interface TaruviConfig {
  apiKey: string      // Identifies which site the client belongs to
  appSlug: string     // Identifies which app the client belongs to
  baseUrl: string     // API endpoint URL
  token?: string      // Optional: Pre-existing auth token
}
```

### Multi-App Setup

The `appSlug` parameter enables a single site to manage multiple applications with isolated data:

```typescript
// Main app
const mainAppClient = new Client({
  apiKey: 'site-key',
  appSlug: 'main-app',
  baseUrl: 'https://api.taruvi.com'
})

// Admin app
const adminAppClient = new Client({
  apiKey: 'site-key',
  appSlug: 'admin-app',
  baseUrl: 'https://api.taruvi.com'
})

// Each app has isolated users, data, and configurations
const mainAuth = new Auth(mainAppClient)
const adminAuth = new Auth(adminAppClient)
```

## Advanced Usage

### Multiple Instances

Create multiple client instances for different environments or tenants:

```typescript
// Production client
const prodClient = new Client({
  apiKey: 'prod-key',
  baseUrl: 'https://api.taruvi.com'
})

// Development client
const devClient = new Client({
  apiKey: 'dev-key',
  baseUrl: 'https://dev-api.taruvi.com'
})

const prodAuth = new Auth(prodClient)
const devAuth = new Auth(devClient)
```

### React Context Integration

```typescript
import { createContext, useContext, ReactNode } from 'react'
import { Client, Auth, User } from '@taruvi/sdk'

// Create context
const TaruviContext = createContext<Client | null>(null)

// Provider component
export function TaruviProvider({ children }: { children: ReactNode }) {
  const client = new Client({
    apiKey: process.env.REACT_APP_TARUVI_API_KEY!,
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

// Usage in components
function MyComponent() {
  const auth = useAuth()
  const user = useUser()

  // Use auth and user services
  return <div>...</div>
}
```

### Vue Composition API

```typescript
import { provide, inject, InjectionKey } from 'vue'
import { Client, Auth } from '@taruvi/sdk'

// Create injection key
const TaruviKey: InjectionKey<Client> = Symbol('taruvi')

// Setup provider
export function setupTaruvi() {
  const client = new Client({
    apiKey: import.meta.env.VITE_TARUVI_API_KEY,
    baseUrl: import.meta.env.VITE_TARUVI_BASE_URL
  })

  provide(TaruviKey, client)
}

// Composable
export function useTaruvi() {
  const client = inject(TaruviKey)
  if (!client) throw new Error('Taruvi not provided')
  return client
}

export function useAuth() {
  const client = useTaruvi()
  return new Auth(client)
}
```

## Architecture

### Design Principles

The Taruvi SDK follows these architectural principles:

1. **Dependency Injection** - No singletons, explicit dependencies
2. **Lazy Initialization** - Create only what you need
3. **Internal API Protection** - Internal utilities marked with `@internal`
4. **Type Safety** - Full TypeScript support
5. **Tree-Shaking** - Unused code is eliminated

### Project Structure

```
src/
├── lib/                      # Public API
│   ├── auth/                 # Auth service
│   ├── user/                 # User service
│   ├── database/             # Database service
│   ├── storage/              # Storage service
│   └── function/             # Functions service
├── lib-internal/             # Internal utilities (not public)
│   ├── http/                 # HTTP client
│   ├── token/                # Token management
│   ├── errors/               # Error handling
│   └── routes/               # API route definitions
├── client.ts                 # Main Client class
├── index.ts                  # Public exports
└── types.ts                  # Shared types
├── lib/                      # Public API
│   ├── auth/                 # Auth service
│   ├── user/                 # User service
│   ├── database/             # Database service
│   ├── storage/              # Storage service
│   └── function/             # Functions service
├── lib-internal/             # Internal utilities (not public)
│   ├── http/                 # HTTP client
│   ├── token/                # Token management
│   ├── errors/               # Error handling
│   └── routes/               # API route definitions
├── client.ts                 # Main Client class
├── index.ts                  # Public exports
└── types.ts                  # Shared types
```

### Internal vs Public API

**Public API** (safe to use):

- `Client` - Main client class
- `Auth`, `User`, `Database`, `Storage`, `Functions` - Service clients
- `TaruviConfig` - Configuration type

**Internal API** (do not use):

- `client.httpClient` - Marked with `@internal`
- `client.tokenClient` - Marked with `@internal`
- Files in `lib-internal/` folder

> ⚠️ **Warning:** Using internal APIs may break in future versions without notice
> ⚠️ **Warning:** Using internal APIs may break in future versions without notice

## Development Status

⚠️ **This SDK is currently in active development**
⚠️ **This SDK is currently in active development**

Current status of service implementations:

- ✅ Core architecture and client initialization
- 🚧 Auth service (in progress)
- 🚧 User service (in progress)
- 📋 Database service (planned)
- 📋 Storage service (planned)
- 📋 Functions service (planned)
- ✅ Core architecture and client initialization
- 🚧 Auth service (in progress)
- 🚧 User service (in progress)
- 📋 Database service (planned)
- 📋 Storage service (planned)
- 📋 Functions service (planned)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For questions and support, please open an issue on GitHub.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For questions and support, please open an issue on GitHub.