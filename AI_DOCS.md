# Taruvi SDK - AI-Friendly Documentation

**Version**: 1.1.0  
**Purpose**: Backend-as-a-Service TypeScript SDK for Taruvi Platform  
**Architecture**: Dependency Injection, Lazy Loading, Tree-Shakeable

---

## Quick Reference

### Installation
```bash
npm install @taruvi/sdk
```

### Basic Usage Pattern
```typescript
import { Client, Auth, User } from '@taruvi/sdk'

const client = new Client({
  apiKey: 'site_key',
  appSlug: 'app_name',
  baseUrl: 'https://test-api.taruvi.cloud'
})

const auth = new Auth(client)
const user = new User(client)
```

---

## Core Architecture

### Design Pattern: Dependency Injection
- **No Singletons**: All services require explicit Client instance
- **Multiple Instances**: Can create multiple clients for different environments
- **Testable**: Easy to mock dependencies

### Client Initialization Flow
1. Create `Client` with config
2. Client creates internal `TokenClient` (manages JWT)
3. Client creates internal `HttpClient` (handles API requests)
4. Services instantiated with Client reference

### Authentication Flow
- **API Key**: Identifies site/app (sent in `Authorization: Token {key}`)
- **JWT Token**: User session (sent in `Authorization: Bearer {jwt}`)
- **Token Storage**: Browser localStorage (`jwt` key)
- **OAuth Callback**: Extracts tokens from URL hash on client init

---

## Client Class

### Constructor
```typescript
new Client(config: TaruviConfig)
```

**Config Interface**:
```typescript
interface TaruviConfig {
  apiKey: string      // Site identifier (required)
  appSlug: string     // App identifier for multi-tenancy (required)
  baseUrl: string     // API endpoint (required)
  deskUrl?: string    // Login page URL (optional)
  token?: string      // Pre-existing JWT (optional)
}
```

**Validation**:
- Throws if `config`, `apiKey`, or `baseUrl` missing
- Creates TokenClient first, then HttpClient
- Extracts OAuth tokens from URL hash if present

**Internal Properties** (marked @internal, not public API):
- `httpClient`: HttpClient instance
- `tokenClient`: TokenClient instance

**Public Methods**:
- `getConfig()`: Returns readonly copy of config

---

## Services

### 1. Auth Service

**Status**: 🚧 Partial (60% complete)

**Import**:
```typescript
import { Auth } from '@taruvi/sdk'
```

**Constructor**:
```typescript
new Auth(client: Client)
```

**Methods**:

#### `authenticateUser()`
```typescript
async authenticateUser(): Promise<void>
```
- Currently empty (commented out implementation)
- Intended for email/password login

#### `isUserAuthenticated()`
```typescript
async isUserAuthenticated(): Promise<boolean>
```
- Checks if `jwt` exists in localStorage
- Returns `true` if token present, `false` otherwise

#### `redirectToLogin()`
```typescript
async redirectToLogin(): Promise<void>
```
- Redirects to login page with current URL as redirect param
- Uses `deskUrl` from config or Settings service
- Browser only

**Planned Methods** (TODO):
- `signInWithSSO()`
- `signOut()`
- `refreshSession()`

---

### 2. User Service

**Status**: ✅ Functional (80% complete)

**Import**:
```typescript
import { User } from '@taruvi/sdk'
```

**Constructor**:
```typescript
new User(client: Client)
```

**Methods**:

#### `getUserData()`
```typescript
async getUserData(): Promise<UserDataResponse>
```
- Fetches current authenticated user profile
- Endpoint: `GET api/users/me/`

**Response Type**:
```typescript
interface UserDataResponse {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  is_active: boolean
  is_staff: boolean
  is_deleted: boolean
  date_joined: string    // ISO 8601
  last_login: string     // ISO 8601
  attributes: string
}
```

#### `createUser()`
```typescript
async createUser(userData: UserCreateRequest): Promise<UserCreateResponse>
```
- Creates new user account
- Endpoint: `POST api/users/`

**Request Type**:
```typescript
interface UserCreateRequest {
  username: string
  email: string
  password: string
  confirm_password: string
  first_name: string
  last_name: string
  is_active: boolean
  is_staff: boolean
  attributes: string
}
```

#### `updateUser()`
```typescript
async updateUser(username: string, body: UserUpdateRequest): Promise<UserCreateResponse>
```
- Updates existing user
- Endpoint: `PUT api/users/{username}/`

**Request Type**:
```typescript
interface UserUpdateRequest {
  username?: string
  email?: string
  password?: string
  confirm_password?: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  is_staff?: boolean
  attributes?: string
}
```

#### `deleteUser()`
```typescript
async deleteUser(username: string): Promise<void>
```
- Deletes user account
- Endpoint: `DELETE api/users/{username}/`

#### `list()`
```typescript
async list(filters: UserList): Promise<unknown>
```
- Lists users with filters
- Endpoint: `GET api/users/?{queryString}`

**Filter Type**:
```typescript
interface UserList {
  search: string
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  is_deleted: boolean
  ordering: string
  page: Number
  page_size: Number
}
```

---

### 3. Storage Service

**Status**: 🚧 Partial (70% complete)

**Import**:
```typescript
import { Storage } from '@taruvi/sdk'
```

**Constructor**:
```typescript
new Storage(client: Client, urlParams: BucketUrlParams, operation?: HttpMethod, body?: object, filters?: StorageFilters)
```

**Pattern**: Chainable query builder (immutable)

**Methods**:

#### `from()`
```typescript
from(bucket: string): Storage
```
- Selects storage bucket
- Returns new Storage instance

#### `filter()`
```typescript
filter(filters: StorageFilters): Storage
```
- Applies query filters
- Returns new Storage instance

#### `upload()`
```typescript
upload(filesData: { files: File[], metadatas: object[], paths: string[] }): Storage
```
- Prepares file upload
- Creates FormData with files, paths, metadata
- Returns new Storage instance

#### `download()`
```typescript
download(path: string): Storage
```
- Prepares file download
- Returns new Storage instance

#### `update()`
```typescript
update(path: string, body: object): Storage
```
- Prepares file metadata update
- Returns new Storage instance

#### `delete()`
```typescript
delete(path: string): Storage
```
- Prepares file deletion
- Returns new Storage instance

#### `execute()`
```typescript
async execute<T>(): Promise<T>
```
- Executes the built query
- Returns response based on operation type

**Usage Example**:
```typescript
const storage = new Storage(client, {})

// List files in bucket
const files = await storage
  .from('my-bucket')
  .filter({ mimetype_category: 'image' })
  .execute()

// Upload files
await storage
  .from('my-bucket')
  .upload({
    files: [file1, file2],
    paths: ['path1', 'path2'],
    metadatas: [{}, {}]
  })
  .execute()
```

**Filter Options** (StorageFilters):
```typescript
interface StorageFilters {
  // Pagination
  page?: number
  pageSize?: number
  
  // Size filters (bytes)
  size__gte?: number
  size__lte?: number
  min_size?: number
  max_size?: number
  
  // Date filters (ISO 8601)
  created_at__gte?: string
  created_at__lte?: string
  created_after?: string
  created_before?: string
  
  // Search
  search?: string
  filename__icontains?: string
  prefix?: string
  
  // MIME type
  mimetype?: string
  mimetype_category?: 'image' | 'video' | 'audio' | 'application' | 'text'
  
  // Visibility
  visibility?: 'public' | 'private'
  
  // User filters
  created_by_me?: boolean
  created_by__username?: string
  
  // Sorting
  ordering?: string
}
```

---

### 4. Database Service

**Status**: 🚧 Partial (70% complete)

**Import**:
```typescript
import { Database } from '@taruvi/sdk'
```

**Constructor**:
```typescript
new Database(client: Client, urlParams: UrlParams, operation?: HttpMethod, body?: object, filters?: DatabaseFilters)
```

**Pattern**: Chainable query builder (immutable)

**Methods**:

#### `from()`
```typescript
from(dataTables: string): Database
```
- Selects data table
- Returns new Database instance

#### `filter()`
```typescript
filter(filters: DatabaseFilters): Database
```
- Applies query filters
- Returns new Database instance

#### `get()`
```typescript
get(recordId: string): Database
```
- Selects specific record
- Returns new Database instance

#### `update()`
```typescript
update(body: any): Database
```
- Prepares record update
- Returns new Database instance

#### `delete()`
```typescript
delete(recordId?: any): Database
```
- Prepares record deletion
- Returns new Database instance

#### `execute()`
```typescript
async execute(): Promise<unknown>
```
- Executes the built query
- Returns response based on operation

**Usage Example**:
```typescript
const database = new Database(client, {})

// List records
const posts = await database
  .from('posts')
  .filter({ page: 1, ordering: '-created_at' })
  .execute()

// Get specific record
const post = await database
  .from('posts')
  .get('post_123')
  .execute()

// Update record
await database
  .from('posts')
  .get('post_123')
  .update({ title: 'New Title' })
  .execute()
```

**Filter Options** (DatabaseFilters):
```typescript
interface DatabaseFilters {
  page?: number
  pageSize?: number
  ordering?: string  // "-field" for desc, "field" for asc
  [key: string]: string | number | boolean | undefined  // Dynamic filters
}
```

---

### 5. Functions Service

**Status**: ✅ Functional (70% complete)

**Import**:
```typescript
import { Functions } from '@taruvi/sdk'
```

**Constructor**:
```typescript
new Functions(client: Client)
```

**Methods**:

#### `execute()`
```typescript
async execute<T = unknown>(functionSlug: string, options?: FunctionRequest): Promise<FunctionResponse<T>>
```
- Invokes serverless function
- Endpoint: `POST api/apps/{appSlug}/functions/{functionSlug}/execute/`

**Request Type**:
```typescript
interface FunctionRequest {
  async?: boolean                    // Default: false
  params?: Record<string, unknown>   // Function parameters
}
```

**Response Type**:
```typescript
interface FunctionResponse<T = unknown> {
  data: T | null
  invocation: {
    invocation_id: number
    celery_task_id: string
    status: string
    created_at: string
    updated_at: string
  }
}
```

**Usage Example**:
```typescript
const functions = new Functions(client)

const result = await functions.execute('send-email', {
  async: false,
  params: {
    to: 'user@example.com',
    subject: 'Hello'
  }
})
```

---

### 6. Settings Service

**Status**: ✅ Functional (70% complete)

**Import**:
```typescript
import { Settings } from '@taruvi/sdk'
```

**Constructor**:
```typescript
new Settings(client: Client)
```

**Methods**:

#### `get()`
```typescript
async get<T = unknown>(): Promise<T>
```
- Fetches site configuration/metadata
- Endpoint: `GET api/settings/metadata/`
- Generic return type for flexible response structure

**Usage Example**:
```typescript
const settings = new Settings(client)

const config = await settings.get()
console.log(config.site_slug)
```

---

### 7. Secrets Service

**Status**: ✅ Functional (70% complete)

**Import**:
```typescript
import { Secrets } from '@taruvi/sdk'
```

**Constructor**:
```typescript
new Secrets(client: Client, urlParams?: SecretsUrlParams, body?: object, method?: HttpMethod)
```

**Pattern**: Chainable query builder (immutable)

**Methods**:

#### `list()`
```typescript
list(): Secrets
```
- Lists all secrets
- Returns new Secrets instance

#### `get()`
```typescript
get(key: string): Secrets
```
- Gets specific secret by key
- Returns new Secrets instance

#### `update()`
```typescript
update(key: string, body: object): Secrets
```
- Updates secret value
- Returns new Secrets instance

#### `execute()`
```typescript
async execute<T = unknown>(): Promise<T>
```
- Executes the built query
- Returns response

**Usage Example**:
```typescript
const secrets = new Secrets(client)

// List secrets
const allSecrets = await secrets.list().execute()

// Get specific secret
const apiKey = await secrets.get('api_key').execute()

// Update secret
await secrets.update('api_key', { value: 'new_value' }).execute()
```

---

## Internal Architecture (Not Public API)

### HttpClient (@internal)

**Purpose**: Handles all HTTP requests with automatic auth headers

**Constructor**:
```typescript
new HttpClient(config: TaruviConfig, tokenClient: TokenClient)
```

**Authentication Headers**:
- `Content-Type: application/json` (except FormData)
- `Authorization: Token {apiKey}` (site/app identification)
- `Authorization: Bearer {jwt}` (user session, overrides API key if present)

**Methods**:
- `get<T>(endpoint: string): Promise<T>`
- `post<T, D>(endpoint: string, body: D): Promise<T>`
- `put<T, D>(endpoint: string, body: D): Promise<T>`
- `delete<T, D>(endpoint: string, body?: D): Promise<T>`
- `patch<T, D>(endpoint: string, body: D): Promise<T>`

**FormData Handling**:
- Detects `body instanceof FormData`
- Omits `Content-Type` header (axios sets with boundary)

---

### TokenClient (@internal)

**Purpose**: Manages JWT token storage and retrieval

**Constructor**:
```typescript
new TokenClient(token?: string)
```

**Runtime Detection**:
- Detects Browser vs Server environment
- Uses `localStorage` in browser
- Returns `null` in server environment

**Methods**:
- `getToken(): string | null` - Retrieves JWT from localStorage (`jwt` key)

**Planned Methods** (TODO):
- `setToken()`
- `refreshToken()`
- `clearToken()`
- `isTokenExpired()`

---

### Utility Functions

#### `buildQueryString()`
```typescript
function buildQueryString(filters: Record<string, unknown> | undefined): string
```
- Converts filter object to URL query string
- Skips `undefined` and `null` values
- Returns `?key=value&key2=value2` or empty string

#### `getRuntimeEnvironment()`
```typescript
function getRuntimeEnvironment(): string
```
- Returns: `'Browser'`, `'ReactNative'`, or `'Server'`

#### `isBrowser()`
```typescript
function isBrowser(): boolean
```
- Checks if `window` and `document` exist

---

## Error Handling

**Current State**: Basic error propagation from axios

**Planned** (TODO):
- Custom error classes
- Error codes
- Retry logic
- Better error messages

---

## TypeScript Types

### Exported Types

All types are exported from main entry point:

```typescript
// Config
export type { TaruviConfig }

// Filters
export type { StorageFilters, DatabaseFilters }

// User
export type { 
  UserCreateRequest, 
  UserResponse, 
  UserDataResponse,
  UserUpdateRequest 
}

// Functions
export type { 
  FunctionRequest, 
  FunctionResponse, 
  FunctionInvocation 
}

// Database
export type { 
  DatabaseRequest, 
  DatabaseResponse 
}

// Storage
export type { 
  StorageRequest, 
  StorageUpdateRequest, 
  StorageResponse 
}

// Settings
export type { 
  SettingsResponse 
}

// Secrets
export type { 
  SecretRequest, 
  SecretResponse 
}
```

---

## Common Patterns

### Pattern 1: Simple Service Usage
```typescript
const client = new Client(config)
const user = new User(client)
const data = await user.getUserData()
```

### Pattern 2: Query Builder (Storage/Database)
```typescript
const storage = new Storage(client, {})
const files = await storage
  .from('bucket')
  .filter({ page: 1 })
  .execute()
```

### Pattern 3: Multiple Environments
```typescript
const prodClient = new Client({ apiKey: 'prod', appSlug: 'prod', baseUrl: 'prod-url' })
const devClient = new Client({ apiKey: 'dev', appSlug: 'dev', baseUrl: 'dev-url' })

const prodUser = new User(prodClient)
const devUser = new User(devClient)
```

### Pattern 4: Multi-Tenancy
```typescript
const customerClient = new Client({
  apiKey: 'site_key',
  appSlug: 'customer-portal',
  baseUrl: 'https://api.taruvi.cloud'
})

const adminClient = new Client({
  apiKey: 'site_key',        // Same site
  appSlug: 'admin-dashboard', // Different app (isolated data)
  baseUrl: 'https://api.taruvi.cloud'
})
```

---

## Framework Integration

### React Context Pattern
```typescript
import { createContext, useContext } from 'react'
import { Client } from '@taruvi/sdk'

const TaruviContext = createContext<Client | null>(null)

export function TaruviProvider({ children }) {
  const client = new Client({ /* config */ })
  return <TaruviContext.Provider value={client}>{children}</TaruviContext.Provider>
}

export function useTaruvi() {
  const client = useContext(TaruviContext)
  if (!client) throw new Error('useTaruvi must be used within TaruviProvider')
  return client
}
```

### Vue 3 Provide/Inject Pattern
```typescript
import { provide, inject, InjectionKey } from 'vue'
import { Client } from '@taruvi/sdk'

const TaruviKey: InjectionKey<Client> = Symbol('taruvi')

export function setupTaruvi() {
  const client = new Client({ /* config */ })
  provide(TaruviKey, client)
}

export function useTaruvi() {
  const client = inject(TaruviKey)
  if (!client) throw new Error('Taruvi not provided')
  return client
}
```

---

## API Endpoint Patterns

### Base URL Structure
```
{baseUrl}/api/{resource}/{action}
```

### User Endpoints
- `GET api/users/me/` - Current user
- `POST api/users/` - Create user
- `PUT api/users/{username}/` - Update user
- `DELETE api/users/{username}/` - Delete user
- `GET api/users/?{filters}` - List users

### Storage Endpoints
- `GET api/apps/{appSlug}/storage/{bucket}/?{filters}` - List files
- `POST api/apps/{appSlug}/storage/{bucket}/upload/` - Upload files
- `GET api/apps/{appSlug}/storage/{bucket}/{path}/` - Download file
- `PUT api/apps/{appSlug}/storage/{bucket}/{path}/` - Update metadata
- `DELETE api/apps/{appSlug}/storage/{bucket}/{path}/` - Delete file

### Database Endpoints
- `GET sites/eox_site/api/apps/{appSlug}/data/{table}/?{filters}` - List records
- `GET sites/eox_site/api/apps/{appSlug}/data/{table}/{recordId}/` - Get record
- `POST sites/eox_site/api/apps/{appSlug}/data/{table}/` - Create record
- `PUT sites/eox_site/api/apps/{appSlug}/data/{table}/{recordId}/` - Update record
- `DELETE sites/eox_site/api/apps/{appSlug}/data/{table}/{recordId}/` - Delete record

### Functions Endpoints
- `POST api/apps/{appSlug}/functions/{functionSlug}/execute/` - Execute function

### Settings Endpoints
- `GET api/settings/metadata/` - Get site config

### Secrets Endpoints
- `GET api/secrets/` - List secrets
- `GET api/secrets/{key}/` - Get secret
- `PUT api/secrets/{key}/` - Update secret

---

## Development Status

### Completed (✅)
- Core Client architecture
- HttpClient with auth headers
- TokenClient with localStorage
- User CRUD operations
- Functions execution
- Settings retrieval
- Secrets management
- Storage query builder (basic)
- Database query builder (basic)

### Partial (🚧)
- Auth service (login/logout incomplete)
- Storage service (upload/download working, needs file operations)
- Database service (CRUD working, needs advanced queries)
- Token management (get working, refresh/expiry pending)

### Planned (📋)
- Error handling classes
- Token refresh logic
- Retry mechanism
- PATCH HTTP method
- Real-time subscriptions
- Offline support
- Comprehensive tests

---

## Key Constraints

1. **Browser-Only Features**:
   - localStorage (JWT storage)
   - OAuth callback token extraction
   - `redirectToLogin()`

2. **Multi-Tenancy**:
   - Same `apiKey` (site) can have multiple `appSlug` (apps)
   - Data is isolated per app

3. **Authentication Hierarchy**:
   - API Key: Site/app identification (always sent)
   - JWT Token: User session (overrides API key when present)

4. **Immutable Query Builders**:
   - Storage and Database use immutable pattern
   - Each method returns new instance
   - Must call `.execute()` to run query

5. **TypeScript Strict Mode**:
   - All types are strictly typed
   - No implicit `any`
   - Full type inference

---

## Testing Guidance

### Mocking Client
```typescript
const mockClient = {
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  },
  tokenClient: {
    getToken: vi.fn()
  },
  getConfig: () => ({ apiKey: 'test', appSlug: 'test', baseUrl: 'test' })
} as unknown as Client
```

### Mocking Services
```typescript
const user = new User(mockClient)
mockClient.httpClient.get.mockResolvedValue({ username: 'test' })
const data = await user.getUserData()
```

---

## Migration Notes

### From Singleton Pattern
**Before**:
```typescript
import taruvi from 'taruvi-sdk'
taruvi.init({ apiKey: 'key' })
const user = taruvi.user.get()
```

**After**:
```typescript
import { Client, User } from '@taruvi/sdk'
const client = new Client({ apiKey: 'key', appSlug: 'app', baseUrl: 'url' })
const user = new User(client)
const data = await user.getUserData()
```

### Benefits
- Multiple client instances
- Better testability
- Tree-shaking support
- No global state
- Explicit dependencies

---

## Bundle Size Optimization

### Tree-Shaking
Only import what you need:
```typescript
// ✅ Good - only User service bundled
import { Client, User } from '@taruvi/sdk'

// ❌ Bad - all services bundled
import * as Taruvi from '@taruvi/sdk'
```

### Lazy Loading
Services are not pre-instantiated:
```typescript
const client = new Client(config)
// Auth, User, Storage not loaded yet

const user = new User(client)  // Only User loaded now
```

---

## Security Best Practices

1. **Never expose API keys in client code**
   - Use environment variables
   - Rotate keys regularly

2. **JWT Storage**
   - Stored in localStorage (XSS vulnerable)
   - Consider httpOnly cookies for production

3. **HTTPS Only**
   - Always use HTTPS baseUrl
   - Never send tokens over HTTP

4. **Token Expiration**
   - Implement token refresh (planned)
   - Handle expired token errors

---

## Common Issues

### Issue: "Config is required"
**Cause**: Client instantiated without config
**Fix**: Pass config object to Client constructor

### Issue: "API key is required"
**Cause**: Config missing `apiKey`
**Fix**: Add `apiKey` to config

### Issue: "Base URL is required"
**Cause**: Config missing `baseUrl`
**Fix**: Add `baseUrl` to config

### Issue: Token not found
**Cause**: User not authenticated or localStorage unavailable
**Fix**: Call auth.authenticateUser() or check browser environment

### Issue: Query builder not executing
**Cause**: Forgot to call `.execute()`
**Fix**: Always end query chain with `.execute()`

---

## Version History

### v1.1.0 (Current)
- Dependency injection pattern
- Lazy service loading
- Tree-shaking support
- Multi-tenancy support
- Query builder pattern for Storage/Database

### v1.0.0
- Initial release
- Basic CRUD operations
- Simple authentication

---

## Related Resources

- **README.md**: User-facing documentation
- **adr.md**: Architecture Decision Record
- **USAGE_EXAMPLE.md**: Code examples
- **API Spec**: Taruvi API_latest.yaml

---

**Last Updated**: 2025-12-12  
**Maintained By**: Taruvi Team  
**License**: MIT
