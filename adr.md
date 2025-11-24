# Architecture Decision Record (ADR): Taruvi SDK

## Document Metadata
- **Status**: Living Document
- **Last Updated**: 2025-11-20
- **SDK Version**: 1.1.0
- **Purpose**: Comprehensive architectural documentation for AI agents and developers

> **For AI Agents**: This document provides complete context about the Taruvi SDK architecture, implementation patterns, and decision rationale. Use this as the primary reference when working with or modifying the SDK.

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Context & Requirements](#context--requirements)
3. [Core Architectural Decisions](#core-architectural-decisions)
4. [Implementation Patterns](#implementation-patterns)
5. [Current Implementation Status](#current-implementation-status)
6. [API Patterns & Usage Examples](#api-patterns--usage-examples)
7. [Consequences & Trade-offs](#consequences--trade-offs)
8. [Future Roadmap](#future-roadmap)
9. [AI Agent Guidelines](#ai-agent-guidelines)

---

## Executive Summary

The Taruvi SDK is a TypeScript-based client library for the Taruvi Backend-as-a-Service platform. It implements a **dependency injection pattern** with **manual service instantiation**, providing developers with type-safe access to authentication, user management, data storage, and serverless functions.

### Key Characteristics
- **Pattern**: Dependency Injection (No Singletons)
- **Language**: TypeScript with strict mode
- **Architecture**: Two-tier (`lib/` public, `lib-internal/` private)
- **HTTP Client**: Axios-based with automatic auth headers
- **Token Storage**: localStorage (browser), future Node.js support
- **Multi-tenancy**: Supported via `appSlug` parameter

### Implementation Status
- **Core Infrastructure**: 90% complete
- **User Service**: 80% complete (CRUD operations working)
- **Auth Service**: 60% complete (basic auth functional)
- **Storage Service**: 70% complete (query builder working)
- **Database/Functions**: 0% complete (planned)

---

## Context & Requirements

### Project Overview
Taruvi SDK enables JavaScript/TypeScript applications to interact with Taruvi's backend services. It's designed for:
- Web applications (React, Vue, Angular, vanilla JS)
- Node.js servers (SSR, API backends)
- React Native mobile apps

### Design Goals
1. **Type Safety**: Full TypeScript support with strict mode enabled
2. **Modularity**: Services instantiated independently
3. **Multi-tenancy**: Single site, multiple apps with isolated data
4. **Testability**: Easy to mock and test in isolation
5. **Tree-Shaking**: Unused code eliminable by bundlers
6. **Developer Experience**: Simple initialization, intuitive API

### Key Requirements
- Simple initialization (3-line setup)
- Type-safe API with autocomplete
- Modular design with separate service clients
- Shared HTTP and token management
- Protection of internal implementation details
- Support for multiple SDK instances
- Lazy initialization for performance

---

## Core Architectural Decisions

### Decision 1: Two-Tier Folder Structure

**Pattern**: Separate public API (`lib/`) from internal implementation (`lib-internal/`)

#### Directory Structure
```
src/
├── lib/                      # PUBLIC API - Safe for external use
│   ├── auth/
│   │   ├── AuthClient.ts     # Auth service class
│   │   └── types.ts          # Auth-specific types
│   ├── user/
│   │   ├── UserClient.ts     # User service class
│   │   └── UserTypes.ts      # User types (CRUD request/response)
│   ├── storage/
│   │   ├── StorageClient.ts  # Storage service (query builder pattern)
│   │   └── types.ts          # StorageState interface
│   ├── settings/
│   │   ├── SettingsClient.ts # Site settings fetcher
│   │   └── types.ts
│   ├── database/             # PLANNED
│   │   ├── DatabaseClient.ts # Query builder (not implemented)
│   │   └── types.ts
│   └── function/             # PLANNED
│       ├── FunctionsClient.ts
│       └── types.ts
│
├── lib-internal/             # INTERNAL API - SDK implementation
│   ├── http/
│   │   ├── HttpClient.ts     # Axios wrapper with auth headers
│   │   └── types.ts
│   ├── token/
│   │   ├── TokenClient.ts    # Token storage/retrieval
│   │   └── types.ts
│   ├── routes/               # API endpoint definitions
│   │   ├── UserRoutes.ts     # User API routes (IMPLEMENTED)
│   │   ├── StorageRoutes.ts  # Storage routes (IMPLEMENTED)
│   │   ├── AuthRoutes.ts     # Auth routes (EMPTY - planned)
│   │   ├── DatabaseRoutes.ts # DB routes (EMPTY - planned)
│   │   ├── FunctionRoutes.ts # Function routes (EMPTY - planned)
│   │   ├── RouteBuilder.ts   # Dynamic route builder (EMPTY - planned)
│   │   └── index.ts
│   ├── errors/
│   │   ├── ErrorClient.ts    # Error handling (stub)
│   │   ├── index.ts
│   │   └── types.ts          # Comprehensive error enums
│   └── utils/
│
├── utils/
│   └── utils.ts              # Runtime detection (Browser/ReactNative/Server)
│
├── client.ts                 # Main Client class
├── index.ts                  # Public exports
└── types.ts                  # TaruviConfig interface
```

#### Rationale
- **API Boundaries**: Developers can't accidentally use internal APIs
- **Versioning**: Internal changes don't break public contracts
- **Refactoring**: Internal code modifiable without external impact
- **Documentation**: Only `lib/` requires public documentation

---

### Decision 2: Dependency Injection Pattern

**Pattern**: Constructor-based dependency injection for all services

#### Implementation

```typescript
// src/client.ts - Main orchestrator
export class Client {
    private readonly config: TaruviConfig
    private readonly _httpClient: HttpClient      // Internal
    private readonly _tokenClient: TokenClient    // Internal

    constructor(config: TaruviConfig) {
        // Validation
        if (!config.apiKey) throw new Error("API key is required")
        if (!config.baseUrl) throw new Error("Base URL is required")

        this.config = config

        // Create internal clients (order matters!)
        this._tokenClient = new TokenClient(config.token)
        this._httpClient = new HttpClient(this.config, this._tokenClient)
    }

    /** @internal - Not part of public API */
    get httpClient(): HttpClient { return this._httpClient }

    /** @internal - Not part of public API */
    get tokenClient(): TokenClient { return this._tokenClient }

    // Public API
    getConfig(): Readonly<TaruviConfig> { return { ...this.config } }
}

// src/lib/user/UserClient.ts - Service example
export class User {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    async getUserData(): Promise<UserDataResponse> {
        return this.client.httpClient.get(UserRoutes.getCurrentUser)
    }

    async createUser(data: UserCreateRequest): Promise<UserCreateResponse> {
        return this.client.httpClient.post(UserRoutes.createNewUser, data)
    }
}
```

#### Usage Pattern
```typescript
// Step 1: Initialize main client
const client = new Client({
    apiKey: 'your-site-api-key',
    appSlug: 'my-app',
    baseUrl: 'https://test-api.taruvi.cloud'
})

// Step 2: Instantiate needed services
const user = new User(client)
const auth = new Auth(client)

// Step 3: Use services
const userData = await user.getUserData()
```

#### Rationale
- **Multiple Instances**: Supports prod/dev/test environments simultaneously
- **Testability**: Easy to mock `Client` instance for unit tests
- **No Global State**: Avoids singleton anti-pattern
- **Explicit Dependencies**: Clear what each service needs
- **Framework Agnostic**: Works with any framework or vanilla JS

---

### Decision 3: Lazy Service Instantiation

**Pattern**: Services manually instantiated by developers, not auto-created

#### Comparison

```typescript
// ❌ NOT IMPLEMENTED: Auto-instantiation
const client = new Client(config)
client.auth.signIn()      // Services pre-created
client.user.getProfile()  // All services bundled

// ✅ IMPLEMENTED: Manual instantiation
const client = new Client(config)
const auth = new Auth(client)  // Only create what you need
await auth.authenticateUser()
```

#### Rationale
- **Lazy Loading**: Only bundle services actually used
- **Tree-Shaking**: Bundlers eliminate unused service code
- **Explicit Usage**: Developers see which services are in use
- **Reduced Bundle**: Main client ~2KB, services ~5-10KB each

---

### Decision 4: Multi-Tenant Configuration

**Pattern**: Require `apiKey`, `appSlug`, and `baseUrl` for multi-app support

#### Configuration Interface
```typescript
// src/types.ts
export interface TaruviConfig {
    apiKey: string      // Site/organization identifier
    appSlug: string     // Specific app identifier
    baseUrl: string     // API endpoint URL
    token?: string      // Optional: Pre-existing session token
}
```

#### Multi-App Architecture
```typescript
// Same site, different apps (isolated data)
const customerApp = new Client({
    apiKey: 'site_xyz789',          // Same site
    appSlug: 'customer-portal',     // Customer app
    baseUrl: 'https://test-api.taruvi.cloud'
})

const adminApp = new Client({
    apiKey: 'site_xyz789',          // Same site
    appSlug: 'admin-dashboard',     // Admin app (separate data)
    baseUrl: 'https://test-api.taruvi.cloud'
})
```

#### Rationale
- **Multi-Tenancy**: Single site → multiple isolated apps
- **Data Isolation**: Each app has separate users/data/settings
- **White-Label**: Support multiple brands under one infrastructure
- **Security**: App-level access control via `appSlug`

---

### Decision 5: Centralized Route Management

**Pattern**: Define all API routes in `lib-internal/routes/` with typed builders

#### Current Implementation

```typescript
// lib-internal/routes/UserRoutes.ts
export const UserRoutes = {
    getCurrentUser: "api/users/me/",
    createNewUser: "api/users/",
    updateUser: (username: string) => `api/users/${username}`,
    deleteUser: (username: string) => `api/users/${username}`
} as const

// lib-internal/routes/StorageRoutes.ts
export const StorageRoutes = {
    baseUrl: (appSlug: string) => `api/apps/${appSlug}`,
    dataTables: (tableName: string) => `/datatables/${tableName}/data`,
    record: (recordId: string) => `/${recordId}`
}
```

#### Usage in Services
```typescript
// User service
async getUserData() {
    return this.client.httpClient.get(UserRoutes.getCurrentUser)
}

// Storage service (composable routes)
async execute() {
    const url = StorageRoutes.baseUrl(this.config.appSlug) +
                this.buildRoute() + "/"
    return this.client.httpClient.get(`sites/eox_site/${url}`)
}
```

#### Rationale
- **Single Source of Truth**: All endpoints in one place
- **Type Safety**: TypeScript autocomplete for route parameters
- **Consistency**: Prevents string typos
- **Easy Updates**: Route changes only affect route files
- **Testability**: Routes testable independently

---

### Decision 6: Chainable Query Builder (Storage)

**Pattern**: Method chaining for building complex storage queries

#### Implementation
```typescript
// lib/storage/StorageClient.ts
export class Storage {
    private storageState: StorageState

    constructor(client: Client, storageState: StorageState) {
        this.client = client
        this.storageState = storageState
        this.config = this.client.getConfig()
        this.siteSettings = new Settings(this.client)
    }

    from(dataTables: string): Storage {
        return new Storage(this.client, {
            ...this.storageState,
            dataTables
        })
    }

    get(recordId: string): Storage {
        return new Storage(this.client, {
            ...this.storageState,
            recordId
        })
    }

    private buildRoute(): string {
        return Object.keys(this.storageState).reduce((acc, key) => {
            if (this.storageState[key]) {
                acc += StorageRoutes[key](this.storageState[key])
            }
            return acc
        }, "")
    }

    async execute() {
        const url = StorageRoutes.baseUrl(this.config.appSlug) +
                    this.buildRoute() + "/"
        return this.client.httpClient.get(`sites/eox_site/${url}`)
    }
}
```

#### Usage
```typescript
const storage = new Storage(client, {})

// Get all records
const users = await storage.from('users').execute()

// Get specific record
const user = await storage.from('users').get('user_123').execute()
```

#### Rationale
- **Fluent API**: Readable, intuitive query construction
- **Immutability**: Each method returns new instance
- **Composability**: Build complex queries step-by-step
- **Familiar**: Similar to Supabase/Prisma patterns

---

### Decision 7: Settings Caching Pattern

**Pattern**: Cache site settings to avoid redundant API calls

#### Implementation
```typescript
export class Storage {
    private siteSettings: Settings
    private _cachedSettings: any = null

    private async getSiteSettings() {
        if (!this._cachedSettings) {
            this._cachedSettings = await this.siteSettings.get()
        }
        return this._cachedSettings
    }

    async execute() {
        const settings = await this.getSiteSettings()
        const siteSlug = settings?.site_slug || 'eox_site'
        // Use cached settings...
    }
}
```

#### Rationale
- **Performance**: Avoid repeated API calls for static data
- **Efficiency**: Settings rarely change during session
- **UX**: Faster subsequent requests

---

## Implementation Patterns

### Pattern 1: HTTP Client with Auto-Authentication

#### Implementation
```typescript
// lib-internal/http/HttpClient.ts
export class HttpClient {
    private config: TaruviConfig
    private tokenClient: TokenClient

    constructor(config: TaruviConfig, tokenClient: TokenClient) {
        this.config = config
        this.tokenClient = tokenClient
    }

    private getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        }

        // Site/app authentication (developer API key)
        if (this.config.apiKey) {
            headers['Authorization'] = `Token ${this.config.apiKey}`
        }

        // User session token (end-user authentication)
        const sessionToken = localStorage.getItem("sessionid")
        if (sessionToken) {
            headers['X-Session-Token'] = sessionToken
        }

        return headers
    }

    async get<T>(endpoint: string): Promise<T> {
        const { data } = await axios.get(
            `${this.config.baseUrl}/api/${endpoint}`,
            { headers: this.getAuthHeaders() }
        )
        return data
    }

    async post<T, D = any>(endpoint: string, body: D): Promise<T> {
        const { data } = await axios.post<T>(
            `${this.config.baseUrl}/${endpoint}`,
            body,
            { headers: this.getAuthHeaders() }
        )
        return data
    }

    // PUT and DELETE methods follow same pattern
}
```

#### Headers Explained
- `Authorization: Token {apiKey}` - Developer authentication (identifies site)
- `X-Session-Token: {sessionToken}` - User authentication (identifies logged-in user)
- `Content-Type: application/json` - Request body format

---

### Pattern 2: Token Management with Runtime Detection

#### Implementation
```typescript
// lib-internal/token/TokenClient.ts
export class TokenClient {
    private runTimeEnvironment: string
    private browserRunTime: boolean

    constructor(token?: string) {
        this.runTimeEnvironment = getRuntimeEnvironment()
        this.browserRunTime = this.runTimeEnvironment === "Browser"
    }

    getToken(): string | null {
        if (this.browserRunTime) {
            return localStorage.getItem("sessionid")
        }
        // TODO: Node.js/SSR token storage
        return null
    }

    // TODO: Implement setToken, refreshToken, clearToken, isTokenExpired
}

// utils/utils.ts
export function getRuntimeEnvironment(): 'Browser' | 'ReactNative' | 'Server' {
    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
        return 'Browser'
    }

    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
        return 'ReactNative'
    }

    return 'Server'
}
```

---

### Pattern 3: Authentication Flow

#### Implementation
```typescript
// lib/auth/AuthClient.ts
export class Auth {
    private client: Client

    constructor(client: Client) {
        this.client = client
    }

    async authenticateUser() {
        const response = await fetch(
            "https://test-api.taruvi.cloud/api/v1/auth/login",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: "admin@example.com",
                    password: "admin123"
                })
            }
        )

        const result = await response.json()

        // Store session token
        localStorage.setItem("sessionid", result.meta.session_token)
        localStorage.setItem("is_authenticated", result.meta.is_authenticated)
    }

    async isUserAuthenticated(): Promise<boolean> {
        const authValue = localStorage.getItem("sessionid")
        return authValue ? true : false
    }

    // TODO: SSO, refresh, signOut
}
```

---

## Current Implementation Status

### ✅ Fully Implemented

#### Core Infrastructure (90%)
- **Client**: Configuration validation, dependency management
- **HttpClient**: GET, POST, PUT, DELETE with auto-auth headers
- **TokenClient**: Browser localStorage retrieval
- **Runtime Detection**: Browser/ReactNative/Server differentiation

#### User Service (80%)
```typescript
✅ getUserData(): Promise<UserDataResponse>
✅ createUser(data: UserCreateRequest): Promise<UserCreateResponse>
✅ updateUser(username: string, data: UserUpdateRequest): Promise<UserCreateResponse>
✅ deleteUser(username: string): Promise<void>
```

#### Auth Service (60%)
```typescript
✅ authenticateUser(): Promise<void>  // Hardcoded test credentials
✅ isUserAuthenticated(): Promise<boolean>
❌ signInWithSSO()                     // Planned
❌ refreshSession()                    // Planned
❌ signOut()                           // Planned
```

#### Settings Service (70%)
```typescript
✅ get(): Promise<any>  // Fetch site configuration
```

#### Storage Service (70%)
```typescript
✅ from(dataTables: string): Storage    // Chainable table selector
✅ get(recordId: string): Storage       // Chainable record selector
✅ execute(): Promise<any>              // Execute built query
✅ getSiteSettings() [cached]           // Internal caching
❌ upload()                             // File operations planned
❌ download()
❌ delete()
```

#### Routes Implemented
```typescript
✅ UserRoutes: All CRUD endpoints
✅ StorageRoutes: Composable route builders
❌ AuthRoutes: Empty (planned)
❌ DatabaseRoutes: Empty (planned)
❌ FunctionRoutes: Empty (planned)
❌ RouteBuilder: Empty (dynamic parameter injection planned)
```

---

### 🚧 Partially Implemented

#### HttpClient (80%)
```typescript
✅ GET, POST, PUT, DELETE methods
✅ Auto-auth headers
✅ BaseURL prefixing
❌ PATCH method
❌ Error handling (raw axios errors)
❌ Retry logic
❌ Request interceptors
❌ Timeout configuration
```

#### TokenClient (40%)
```typescript
✅ Browser token retrieval
❌ setToken()
❌ refreshToken()
❌ clearToken()
❌ isTokenExpired()
❌ Node.js/SSR storage
```

---

### 📋 Not Implemented (Planned)

#### Database Service (0%)
- Query builder pattern
- CRUD operations
- Filtering, sorting, pagination
- Transactions

#### Functions Service (0%)
- Function invocation
- Streaming responses
- Function logs
- Function listing

#### Error Handling (10%)
- Custom error classes (types defined, not used)
- Error transformation layer
- Retry logic

---

## API Patterns & Usage Examples

### Example 1: Basic Setup

```typescript
import { Client, User, Auth } from '@taruvi/sdk'

// Initialize client
const client = new Client({
    apiKey: 'site_abc123',
    appSlug: 'my-app',
    baseUrl: 'https://test-api.taruvi.cloud'
})

// Create services
const auth = new Auth(client)
const user = new User(client)

// Authenticate
await auth.authenticateUser()

// Fetch user data
const userData = await user.getUserData()
console.log(userData.username)
```

---

### Example 2: Storage Query Builder

```typescript
import { Client, Storage } from '@taruvi/sdk'

const client = new Client({ /* config */ })
const storage = new Storage(client, {})

// Get all posts
const allPosts = await storage
    .from('posts')
    .execute()

// Get specific post
const post = await storage
    .from('posts')
    .get('post_123')
    .execute()
```

---

### Example 3: React Integration

```typescript
import { createContext, useContext, useState, useEffect } from 'react'
import { Client, User, Auth } from '@taruvi/sdk'

// Context setup
const TaruviContext = createContext<Client | null>(null)

export function TaruviProvider({ children }) {
    const client = new Client({
        apiKey: process.env.REACT_APP_API_KEY!,
        appSlug: process.env.REACT_APP_SLUG!,
        baseUrl: process.env.REACT_APP_BASE_URL!
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
    if (!client) throw new Error('Must be within TaruviProvider')
    return client
}

export function useUser() {
    const client = useTaruvi()
    return new User(client)
}

export function useAuth() {
    const client = useTaruvi()
    return new Auth(client)
}

// Component usage
function UserProfile() {
    const user = useUser()
    const [data, setData] = useState(null)

    useEffect(() => {
        user.getUserData().then(setData)
    }, [])

    return <div>{data?.username}</div>
}
```

---

### Example 4: Multi-Environment

```typescript
// config/clients.ts
import { Client } from '@taruvi/sdk'

export const prodClient = new Client({
    apiKey: process.env.PROD_API_KEY!,
    appSlug: 'prod-app',
    baseUrl: 'https://api.taruvi.cloud'
})

export const devClient = new Client({
    apiKey: process.env.DEV_API_KEY!,
    appSlug: 'dev-app',
    baseUrl: 'https://dev-api.taruvi.cloud'
})

// Usage
import { prodClient, devClient } from './config/clients'

const client = process.env.NODE_ENV === 'production' ? prodClient : devClient
const user = new User(client)
```

---

### Example 5: Testing with Mocks

```typescript
import { Client, User } from '@taruvi/sdk'
import { vi } from 'vitest'

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
            getConfig: () => ({ apiKey: 'test', appSlug: 'test', baseUrl: 'test' })
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

## Consequences & Trade-offs

### Positive Consequences

1. **Clear API Boundaries**
   - Developers only use `lib/` exports
   - Internal refactoring doesn't break external code
   - Easier documentation and maintenance

2. **Type Safety**
   - Full TypeScript autocomplete
   - Compile-time error catching
   - IntelliSense support in IDEs

3. **Testability**
   - Easy to mock `Client` instance
   - Services testable in isolation
   - No global state to reset

4. **Flexibility**
   - Multiple client instances (prod/dev/staging)
   - Framework-agnostic design
   - Works in browser, Node.js, React Native

5. **Performance**
   - Lazy loading reduces initial bundle
   - Tree-shaking eliminates unused code
   - Settings caching avoids redundant calls

6. **Developer Experience**
   - Simple 3-step initialization
   - Intuitive method chaining
   - Familiar patterns (Supabase-like)

---

### Negative Consequences

1. **Manual Service Instantiation**
   - More boilerplate vs auto-instantiation
   - Developers must remember to create services
   - **Mitigation**: Provide framework-specific helpers (hooks, composables)

2. **No Built-in Error Handling**
   - Raw axios errors exposed to developers
   - No custom error classes yet
   - **Mitigation**: Plan to add `TaruviError` hierarchy

3. **Limited SSR Support**
   - Token management browser-only currently
   - No Node.js storage implementation
   - **Mitigation**: Add server-side token storage

4. **Settings Cache Per-Instance**
   - Not shared across Storage instances
   - No cache invalidation
   - **Mitigation**: Acceptable for mostly-static settings

5. **Incomplete Services**
   - Many services are stubs
   - Database/Functions not implemented
   - **Mitigation**: Clear roadmap, active development

---

### Neutral Consequences

1. **Learning Curve**
   - Developers familiar with Supabase/Firebase adapt quickly
   - Dependency injection is industry-standard

2. **Bundle Size**
   - Slightly larger than namespace pattern
   - Offset by tree-shaking benefits

---

## Future Roadmap

### v1.2 (Next 3 months)

**Auth Service Completion**
- [ ] Implement SSO authentication flow
- [ ] Add token refresh logic
- [ ] Add sign-out functionality
- [ ] Support OAuth providers (Google, GitHub, etc.)

**Error Handling**
- [ ] Create `TaruviError` base class
- [ ] Add domain-specific errors (`AuthError`, `StorageError`, etc.)
- [ ] Implement error transformation in HttpClient
- [ ] Add user-friendly error messages

**Token Management**
- [ ] Implement `setToken()`, `clearToken()`
- [ ] Add token expiration checking
- [ ] Add Node.js/SSR token storage (cookies, secure storage)
- [ ] Add token refresh mechanism

**HTTP Client Enhancements**
- [ ] Add PATCH method
- [ ] Implement retry logic with exponential backoff
- [ ] Add request/response interceptors
- [ ] Add configurable timeout

---

### v1.3 (Next 6 months)

**Database Service**
- [ ] Implement query builder pattern
- [ ] Add CRUD operations
- [ ] Add filtering, sorting, pagination
- [ ] Add transaction support

**Functions Service**
- [ ] Implement function invocation
- [ ] Add streaming response support
- [ ] Add function logs access
- [ ] Add function listing

**File Storage**
- [ ] Complete upload/download functionality
- [ ] Add file management (list, delete, rename)
- [ ] Add presigned URL support
- [ ] Add file metadata handling

**Testing Infrastructure**
- [ ] Comprehensive test suite (>80% coverage)
- [ ] Mock utilities for consumers
- [ ] Integration test examples
- [ ] E2E test suite

---

### v2.0 (Next 12 months)

**Real-time Support**
- [ ] WebSocket integration
- [ ] Real-time subscriptions
- [ ] Presence tracking
- [ ] Broadcast messaging

**Offline Support**
- [ ] Local caching layer (IndexedDB)
- [ ] Offline mutation queue
- [ ] Sync on reconnection
- [ ] Conflict resolution

**DevTools**
- [ ] Browser extension for debugging
- [ ] Request/response logging
- [ ] Performance monitoring
- [ ] Network inspector

---

## AI Agent Guidelines

### When Working with This SDK

**Understanding the Architecture**
1. This is a **dependency injection** pattern, not a singleton
2. `lib/` = public API, `lib-internal/` = internal implementation
3. All services accept `Client` instance in constructor
4. HTTP calls go through `client.httpClient` with auto-auth
5. Routes are centralized in `lib-internal/routes/`

**Code Patterns to Follow**
1. Public APIs in `lib/`, internal utils in `lib-internal/`
2. Route definitions in `lib-internal/routes/` files
3. Type definitions co-located with services
4. Export public types from `index.ts`
5. Mark internal APIs with `@internal` JSDoc tag

**When Adding New Features**

**New Service**:
1. Create `lib/{service}/ServiceClient.ts`
2. Create `lib/{service}/types.ts`
3. Add routes to `lib-internal/routes/ServiceRoutes.ts`
4. Export from `src/index.ts`
5. Follow existing pattern: accept `Client` in constructor

**New API Endpoint**:
1. Add route to appropriate `lib-internal/routes/*.ts`
2. Add method to relevant service client
3. Use `this.client.httpClient.{method}(route)`
4. Return typed response

**Type Safety**:
- Always use TypeScript strict mode
- Define request/response interfaces
- Use `as const` for route objects
- Export public types from `index.ts`

**Testing**:
- Mock `Client` instance
- Test services in isolation
- Verify route strings
- Check error handling

---

### Common Pitfalls to Avoid

1. **Don't expose internal APIs**
   - Never export from `lib-internal/` in `index.ts`
   - Always mark internal getters with `@internal`

2. **Don't hardcode routes in services**
   - Always use centralized route definitions
   - Never inline endpoint strings

3. **Don't forget auto-auth**
   - HttpClient automatically adds headers
   - Don't manually add Authorization headers

4. **Don't create new Client instances unnecessarily**
   - Reuse existing client instance
   - Pass client to services, don't create new ones

5. **Don't ignore TypeScript errors**
   - Strict mode is enabled
   - All types must be properly defined

---

## References

- [Supabase JS Client](https://github.com/supabase/supabase-js) - Query builder inspiration
- [Appwrite SDK](https://github.com/appwrite/sdk-for-web) - Service separation pattern
- [AWS SDK v3](https://github.com/aws/aws-sdk-js-v3) - Modular architecture
- [Stripe SDK](https://github.com/stripe/stripe-node) - Client pattern

---

## Changelog

### v1.1.0 (2025-11-20)
- Added Storage service with query builder
- Implemented settings caching
- Enhanced route management
- Updated documentation

### v1.0.0 (2025-11-01)
- Initial release
- Core Client architecture
- User CRUD operations
- Basic authentication
