# ADR: Taruvi SDK Client
## Context

We need to build a client SDK for the Taruvi platform that allows developers to easily integrate with our backend services including but not limited to authentication, access management, user management, storage, database operations, and edge functions. The SDK should provide a clean, intuitive API similar to established platforms like Appwrite and Supabase, while maintaining clear boundaries between internal implementation details and the public API surface.

### Key Requirements

- Simple initialization process for developers
- Type-safe API with TypeScript support
- Modular design with separate clients for different services
- Shared HTTP and token management across all services
- Protection of internal implementation details from SDK consumers
- Support for multiple SDK instances for multi-tenant scenarios
- Lazy initialization of service clients for better performance
- Dependency injection pattern for better testability

## Decision

We have decided to implement a **layered client architecture** with the following key design decisions:

### 1. Two-Tier Folder Structure: `lib` and `lib-internal`

**Decision:** Separate the SDK into two distinct folders:

- **`lib/`** - Public API exposed to developers
  - `auth/` - Authentication client
  - `user/` - User management client
  - `storage/` - Storage operations client
  - `database/` - Database operations client
  - `function/` - Edge functions client

- **`lib-internal/`** - Internal utilities not exposed to developers
  - `http/` - HTTP client for API requests
  - `token/` - Token management and storage
  - `errors/` - Error handling utilities
  - `utils/` - Helper functions

**Rationale:**
- Clear separation of concerns between public API and internal implementation
- Prevents developers from depending on internal APIs that may change
- Simplifies versioning and breaking change management
- Enables internal refactoring without affecting public API
- Follows principle of least privilege - only expose what's necessary

### 2. Dependency Injection Pattern for Client Instantiation

**Decision:** Use dependency injection pattern where `Client` is a regular class with a public constructor, and service clients receive the main client instance as a constructor parameter.

```typescript
export class Client {
    private readonly config: TaruviConfig
    readonly httpClient: HttpClient
    readonly tokenClient: TokenClient

    constructor(config: TaruviConfig) {
        this.config = config
        this.httpClient = new HttpClient(this.config)
        this.tokenClient = new TokenClient(config.token)
    }
}

// Service clients accept Client instance
export class Auth {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }
}
```

**Rationale:**
- **Multiple Instances:** Supports multi-tenant scenarios and testing with different configurations
- **Better Testability:** Easy to mock and inject dependencies in unit tests
- **No Global State:** Avoids singleton anti-pattern and hidden dependencies
- **Lazy Initialization:** Developers only instantiate the service clients they actually need
- **Framework Flexibility:** Works seamlessly with React Context, Vue provide/inject, or dependency injection frameworks
- **Tree-Shaking:** Unused service clients can be eliminated by bundlers

### 3. Lazy Client Instantiation with Dependency Injection

**Decision:** Export individual service client classes that developers manually instantiate with the main `Client` instance.

```typescript
// Main client only contains internal utilities
export class Client {
    readonly httpClient: HttpClient
    readonly tokenClient: TokenClient
}

// Developers manually instantiate service clients
const client = new Client({ apiKey: '...', baseUrl: '...' })
const auth = new Auth(client)
const user = new User(client)
```

**Rationale:**
- **Lazy Loading:** Service clients are only created when needed, reducing initial bundle size
- **Explicit Dependencies:** Clear which services are being used in each part of the application
- **Better Tree-Shaking:** Unused service clients are completely eliminated from production bundles
- **Separation of Concerns:** Each client handles one domain responsibility independently
- **Maintainability:** Easier to locate and modify domain-specific logic
- **Testability:** Can test each client independently without instantiating the entire SDK
- **Extensibility:** Easy to add new service clients without modifying the main client

### 4. Shared Internal Utilities

**Decision:** The main `Client` class manages shared internal utilities (`HttpClient` and `TokenClient`) that service clients access through dependency injection.

**Rationale:**
- Ensures all service clients share the same HTTP configuration
- Centralizes token management for consistent authentication across services
- Reduces code duplication
- Makes clients easier to test with mock dependencies
- Enables cross-cutting concerns (logging, retry logic) in one place

### 5. Multi-Tenant Configuration with App Identification

**Decision:** Require essential configuration parameters that identify both the site and the specific app: `apiKey`, `appSlug`, and `baseUrl` (with optional `token`).

```typescript
interface TaruviConfig {
    apiKey: string      // Identifies which site the client belongs to
    appSlug: string     // Identifies which app the client belongs to
    baseUrl: string     // API endpoint URL
    token?: string      // Optional: Pre-existing auth token
}
```

**Rationale:**
- **Multi-App Support:** `appSlug` enables a single site to manage multiple applications
- **Site Identification:** `apiKey` authenticates and identifies the site/organization
- **App Isolation:** Each app can have isolated data, users, and configurations
- **Flexibility:** Supports various deployment scenarios (multi-tenant SaaS, white-label solutions)
- **Security:** Clear separation between site-level and app-level access control
- **Reduces cognitive load** for developers with clear, minimal configuration
- **Prevents misconfiguration** through required parameters
- **Easy to extend** with optional parameters later

### 6. Centralized Route Management in `lib-internal/routes`

**Decision:** Organize all API route definitions in a dedicated `lib-internal/routes` folder with separate files for each service domain.

```typescript
// lib-internal/routes/auth.routes.ts
export const AUTH_ROUTES = {
  SIGN_IN: '/auth/sign-in',
  SIGN_UP: '/auth/sign-up',
  VERIFY_EMAIL: '/auth/verify-email/:token',
} as const

export const buildAuthRoute = {
  verifyEmail: (token: string) => 
    RouteBuilder.build(AUTH_ROUTES.VERIFY_EMAIL, { token }),
}
```

**Rationale:**
- **Single Source of Truth:** All API endpoints defined in one location
- **Easy Maintenance:** API route changes only require updates in route files
- **Type Safety:** TypeScript autocomplete and validation for all routes
- **Consistency:** Prevents route string typos and inconsistencies across clients
- **Testability:** Routes can be tested independently of client logic
- **Separation of Concerns:** Routes are implementation details, not part of public API
- **Dynamic Route Building:** Centralized utility for handling path parameters and query strings

## Consequences

### Positive

1. **Clear API Boundaries:** Developers only see and use public APIs from `lib/`, reducing confusion
2. **Consistent State Management:** Singleton ensures shared state across the application
3. **Better Developer Experience:** Simple initialization and intuitive API structure
4. **Maintainability:** Clear separation makes codebase easier to navigate and modify
5. **Testability:** Each client can be tested in isolation
6. **Extensibility:** Easy to add new service clients without architectural changes
7. **Type Safety:** Full TypeScript support with proper type definitions
8. **Centralized Route Management:** Single source of truth for all API endpoints prevents inconsistencies and makes updates easier
9. **Reduced Route Errors:** Type-safe route builders eliminate string typos and parameter mistakes

### Negative

1. **Global State:** The global variable pattern may be considered an anti-pattern in some contexts
2. **Singleton Limitations:** Difficult to have multiple SDK instances (e.g., multi-tenant scenarios)
3. **Testing Complexity:** Singleton requires careful test cleanup to avoid state leakage between tests
4. **Tree-Shaking:** Global variable pattern may hinder tree-shaking in some bundlers
5. **Server-Side Rendering:** Singleton pattern requires special handling in SSR environments

### Neutral

1. **Learning Curve:** Developers familiar with Firebase/Supabase will find this pattern familiar
2. **Bundle Size:** Composition pattern may increase bundle size slightly, but enables tree-shaking of unused clients

## Mitigation Strategies

### For Singleton Limitations

If multiple instances are needed in the future, consider:
- Adding a `createClient()` factory function alongside singleton pattern
- Implementing a client registry for named instances

```typescript
export const createClient = (config: TaruviConfig) => {
    return new Client(config) // Non-singleton
}
```

### For Testing

Provide test utilities:
```typescript
export const resetClient = () => {
    Client.instance = null
}
```

### For SSR

Document SSR-specific initialization patterns:
```typescript
// Server-side: Create new instance per request
const client = createClient(config)

// Client-side: Use singleton pattern
initializeTaruvi(config)
```

## Alternatives Considered

### 1. Context Provider Pattern (React-specific)

**Rejected Reason:** Ties SDK to React, requires provider wrapping, more boilerplate

### 2. Pure Factory Pattern (No Singleton)

```typescript
export const createClient = (config) => new Client(config)
```

**Rejected Reason:** Developers would need to manage client instance passing throughout their application, increasing complexity

### 3. Namespace Pattern (Single Object with Methods)

```typescript
export const taruvi = {
    auth: { signIn: () => {}, signUp: () => {} },
    user: { getProfile: () => {} }
}
```

**Rejected Reason:** Harder to manage shared state, less extensible, no dependency injection benefits

### 4. Fully Exposed Internal APIs

**Rejected Reason:** Would couple developers to internal implementation details, making future changes breaking

## Implementation Notes

### Current Structure

```
src/
├── lib/                      # Public API
│   ├── auth/
│   │   ├── AuthClient.ts     # exports: Auth class
│   │   └── types.ts
│   ├── user/
│   │   ├── UserClient.ts     # exports: User class
│   │   └── types.ts
│   ├── storage/
│   │   ├── StorageClient.ts  # exports: Storage class
│   │   └── types.ts
│   ├── database/
│   │   ├── DatabaseClient.ts # exports: Database class
│   │   └── types.ts
│   └── function/
│       ├── FunctionsClient.ts # exports: Functions class
│       └── types.ts
├── lib-internal/             # Private utilities
│   ├── http/
│   │   ├── HttpClient.ts
│   │   └── types.ts
│   ├── token/
│   │   ├── TokenClient.ts
│   │   └── client.ts
│   ├── routes/              # API route definitions
│   │   ├── RouteBuilder.ts  # Handles url parsing
│   │   ├── AuthRoutes.ts
│   │   ├── UserRoutes.ts
│   │   ├── StorageRoutes.ts
│   │   ├── DatabaseRoutes.ts
│   │   ├── FunctionRoutes.ts
│   │   └── index.ts
│   ├── errors/
│   └── utils/
├── client.ts                 # Main Client
├── index.ts                  # Public exports
└── types.ts                  # Shared types
```

### Usage Example

```typescript
// Initialize the main client
import { Client, Auth, User, Storage } from '@taruvi/sdk'

const client = new Client({
    apiKey: 'your-site-api-key',
    appSlug: 'my-app',
    baseUrl: 'https://api.taruvi.com'
})

// Create only the service clients you need
const auth = new Auth(client)
const user = new User(client)
const storage = new Storage(client)

// Use the service clients
async function loginUser(email: string, password: string) {
    const response = await auth.signIn({ email, password })
    return response
}

async function uploadFile(file: File) {
    const response = await storage.upload(file)
    return response
}

// Or use with React Context for app-wide access
import { createContext, useContext } from 'react'

const TaruviContext = createContext<Client | null>(null)

export function TaruviProvider({ children }) {
    const client = new Client({
        apiKey: '...',
        appSlug: '...',
        baseUrl: '...'
    })
    return <TaruviContext.Provider value={client}>{children}</TaruviContext.Provider>
}

export function useAuth() {
    const client = useContext(TaruviContext)
    return new Auth(client)
}
```


## References

- [Appwrite SDK Architecture](https://github.com/appwrite/sdk-generator)
- [Supabase JS Client](https://github.com/supabase/supabase-js)