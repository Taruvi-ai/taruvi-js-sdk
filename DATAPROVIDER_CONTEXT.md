# Taruvi SDK - Complete Codebase Reference for Data Provider Generation

## Project Overview

**Taruvi SDK** (`@taruvi-io/sdk`) is a TypeScript SDK for the Taruvi Data Service - a PostgREST-like dynamic API system that provides:
- Dynamic database table creation and management
- File storage with bucket-based organization
- Serverless function execution
- Multi-tenant architecture with app isolation
- Rich querying with 32+ filter operators (Refine.dev compatible)
- JWT-based authentication

---

## Architecture Principles

1. **Dependency Injection** - No singletons; services receive `Client` instance
2. **Two-Tier API** - Public (`lib/`) vs Internal (`lib-internal/`)
3. **Query Builder Pattern** - Chainable, fluent APIs with deferred execution
4. **Type Safety** - Full TypeScript with strict mode
5. **Tree-Shakeable** - Modular exports for bundle optimization

---

## Directory Structure

```
src/
├── client.ts              # Main Client orchestrator
├── index.ts               # Public exports
├── types.ts               # Core config + filter types
│
├── lib/                   # PUBLIC API
│   ├── auth/AuthClient.ts
│   ├── user/UserClient.ts
│   ├── Storage/StorageClient.ts
│   ├── Database/DatabaseClient.ts
│   ├── Function/FunctionsClient.ts
│   ├── Settings/SettingsClient.ts
│   └── Secrets/SecretsClient.ts
│
├── lib-internal/          # INTERNAL API
│   ├── http/HttpClient.ts
│   ├── token/TokenClient.ts
│   ├── routes/*.ts
│   └── errors/types.ts
│
└── utils/
    ├── utils.ts           # Runtime detection, buildQueryString
    └── enums.ts           # MimeTypeCategory, Visibility
```

---

## Core Configuration

```typescript
interface TaruviConfig {
    apiKey: string      // Site/organization identifier
    appSlug: string     // App identifier (multi-tenant)
    baseUrl: string     // API endpoint (e.g., https://test-api.taruvi.cloud)
    token?: string      // Optional pre-existing JWT token
}
```

---

## Client Initialization

```typescript
import { Client, Database, Storage, User, Auth, Functions, Secrets } from '@taruvi-io/sdk'

const client = new Client({
    apiKey: 'your-site-api-key',
    appSlug: 'my-app',
    baseUrl: 'https://test-api.taruvi.cloud'
})

// Services are instantiated with the client
const db = new Database(client, {})
const storage = new Storage(client, {})
const user = new User(client)
const auth = new Auth(client)
const functions = new Functions(client)
```

---

## HTTP Client (Internal)

```typescript
class HttpClient {
    constructor(config: TaruviConfig, tokenClient: TokenClient)

    // Authentication headers:
    // - Token {apiKey} (developer auth)
    // - Bearer {jwt} (user auth - takes precedence)

    async get<T>(endpoint: string): Promise<T>
    async post<T, D>(endpoint: string, body: D): Promise<T>
    async put<T, D>(endpoint: string, body: D): Promise<T>
    async patch<T, D>(endpoint: string, body: D): Promise<T>
    async delete<T, D>(endpoint: string, body?: D): Promise<T>
}
```

---

## API Endpoints

### Database Routes
```
GET    /api/apps/{appSlug}/datatables/{tableName}/data/           # List records
GET    /api/apps/{appSlug}/datatables/{tableName}/data/{id}/      # Get record
POST   /api/apps/{appSlug}/datatables/{tableName}/data/           # Create record
PATCH  /api/apps/{appSlug}/datatables/{tableName}/data/{id}/      # Update record
DELETE /api/apps/{appSlug}/datatables/{tableName}/data/{id}/      # Delete record
```

### Storage Routes
```
GET    /api/apps/{appSlug}/storage/buckets/{bucket}/objects/           # List files
GET    /api/apps/{appSlug}/storage/buckets/{bucket}/objects/{path}/    # Get file
POST   /api/apps/{appSlug}/storage/buckets/{bucket}/objects/batch-upload  # Upload
POST   /api/apps/{appSlug}/storage/buckets/{bucket}/objects/batch-delete  # Delete
PUT    /api/apps/{appSlug}/storage/buckets/{bucket}/objects/{path}/    # Update metadata
```

### User Routes
```
GET    /api/users/              # List users
GET    /api/users/me/           # Current user
POST   /api/users/              # Create user
PUT    /api/users/{username}/   # Update user
DELETE /api/users/{username}/   # Delete user
```

### Function Routes
```
POST   /api/functions/apps/{appSlug}/functions/{functionSlug}/execute/
```

### Settings Routes
```
GET    /api/settings/metadata/
```

### Secrets Routes
```
GET    /api/secrets/
GET    /api/secrets/{key}/
PUT    /api/secrets/{key}/
```

---

## Query Parameters (Refine.dev Compatible)

### Pagination
- `_start=0` / `_end=10` (offset-based)
- `page=1` / `pageSize=20` (DRF style)
- `limit=10` / `offset=0`

### Sorting
- `_sort=created_at,name`
- `_order=DESC,ASC`
- `ordering=-created_at` (DRF style: `-` prefix for DESC)

### Filtering (32+ Operators)
```
# Exact match
status=active

# Comparison
age_gte=18          # >=
age_gt=18           # >
age_lte=65          # <=
age_lt=65           # <
age_between=18,65   # range

# String operations
name_contains=john
name_startswith=J
name_endswith=son
name_icontains=john  # case-insensitive

# Array operations
status_in=active,pending
tags_nin=deleted

# Null checks
deleted_at_null=true
email_nnull=true

# Foreign key population
populate=*              # All relations
populate=user_id,org_id # Specific relations
```

### Storage-Specific Filters
```typescript
interface StorageFilters {
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
    mimetype__in?: string
    mimetype_category?: 'image' | 'video' | 'audio' | 'application' | 'text'

    // Visibility
    visibility?: 'public' | 'private'
    created_by_me?: boolean

    // Sorting
    ordering?: string
}
```

### Database Filters
```typescript
interface DatabaseFilters {
    page?: number
    pageSize?: number
    ordering?: string  // "-field" for DESC, "field" for ASC

    // Dynamic filters - any field with operators
    [key: string]: string | number | boolean | undefined
}
```

---

## Data Types

### User Types
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
    date_joined: string  // ISO 8601
    last_login: string
    attributes: string
}

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

### Storage Types
```typescript
interface StorageRequest {
    files: File[]
    paths: string[]
    metadatas: object[]
}

interface StorageUpdateRequest {
    metadata?: Record<string, unknown>
    visibility?: 'public' | 'private'
}

interface StorageResponse {
    id: number
    uuid: string
    filename: string
    file_path: string
    file_url: string
    size: number
    mimetype: string
    metadata?: Record<string, unknown>
    visibility?: string
    created_at: string
    updated_at: string
}
```

### Database Types
```typescript
interface DatabaseRequest {
    [key: string]: unknown
}

interface DatabaseResponse<T = unknown> {
    id?: string | number
    created_at?: string
    updated_at?: string
    [key: string]: T | string | number | undefined
}
```

### Function Types
```typescript
interface FunctionRequest {
    async?: boolean
    params?: Record<string, unknown>
}

interface FunctionInvocation {
    invocation_id: number
    celery_task_id: string
    status: string
    created_at: string
    updated_at: string
}

interface FunctionResponse<T = unknown> {
    data: T | null
    invocation: FunctionInvocation
}
```

### Secret Types
```typescript
interface SecretRequest {
    value: string
}

interface SecretResponse {
    key: string
    value: string
    created_at?: string
    updated_at?: string
}
```

---

## Current Service Implementations

### Database (Query Builder Pattern)
```typescript
class Database {
    constructor(client: Client, urlParams: UrlParams, operation?: HttpMethod, body?: object, filters?: DatabaseFilters)

    from(tableName: string): Database
    filter(filters: DatabaseFilters): Database
    get(recordId: string): Database
    update(body: any): Database
    delete(recordId?: string): Database
    execute(): Promise<T>
}

// Usage
const records = await db
    .from('users')
    .filter({ status: 'active', age_gte: 18 })
    .execute()

const record = await db
    .from('users')
    .get('123')
    .execute()

await db
    .from('users')
    .get('123')
    .update({ status: 'inactive' })
    .execute()
```

### Storage (Query Builder Pattern)
```typescript
class Storage {
    constructor(client: Client, urlParams: BucketUrlParams, operation?: HttpMethod, body?: object, filters?: StorageFilters)

    from(bucket: string): Storage
    filter(filters: StorageFilters): Storage
    download(path: string): Storage
    upload(filesData: { files: File[], paths: string[], metadatas: object[] }): Storage
    update(path: string, body: object): Storage
    delete(path: string): Storage
    execute(): Promise<T>
}

// Usage
const files = await storage
    .from('uploads')
    .filter({ mimetype_category: 'image', size__lte: 5000000 })
    .execute()

await storage
    .from('uploads')
    .upload({ files: [file], paths: ['images/photo.jpg'], metadatas: [{ alt: 'Photo' }] })
    .execute()
```

### User (Direct Methods)
```typescript
class User {
    constructor(client: Client)

    getUserData(): Promise<UserDataResponse>
    createUser(userData: UserCreateRequest): Promise<UserCreateResponse>
    updateUser(username: string, body: UserUpdateRequest): Promise<UserCreateResponse>
    deleteUser(username: string): Promise<void>
    list(filters: UserList): Promise<any>
}

// Usage
const currentUser = await user.getUserData()
const users = await user.list({ is_active: true, page: 1, page_size: 20 })
```

### Auth
```typescript
class Auth {
    constructor(client: Client)

    authenticateUser(): Promise<void>  // Stores JWT in localStorage
    isUserAuthenticated(): Promise<boolean>
    redirectToLogin(): Promise<void>
}
```

### Functions
```typescript
class Functions {
    constructor(client: Client)

    execute<T>(functionSlug: string, options?: FunctionRequest): Promise<FunctionResponse<T>>
}

// Usage
const result = await functions.execute<{ sum: number }>('calculate', {
    async: false,
    params: { a: 1, b: 2 }
})
```

### Settings
```typescript
class Settings {
    constructor(client: Client)

    get<T>(): Promise<T>
}

// Usage
const config = await settings.get<{ theme: string, features: string[] }>()
```

### Secrets (Query Builder Pattern)
```typescript
class Secrets {
    constructor(client: Client, urlParams?: SecretsUrlParams, body?: object, method?: HttpMethod)

    list(): Secrets
    get(key: string): Secrets
    update(key: string, body: object): Secrets
    execute<T>(): Promise<T>
}

// Usage
const allSecrets = await secrets.list().execute()
const apiKey = await secrets.get('API_KEY').execute()
await secrets.update('API_KEY', { value: 'new-key' }).execute()
```

---

## Route Definitions

### DatabaseRoutes
```typescript
const DatabaseRoutes = {
    baseUrl: (appSlug: string) => `api/apps/${appSlug}`,
    dataTables: (tableName: string): string => `/datatables/${tableName}/data`,
    recordId: (recordId: string): string => `/${recordId}`
}
```

### StorageRoutes
```typescript
const StorageRoutes = {
    baseUrl: (appslug: string, bucket: string) => `api/apps/${appslug}/storage/buckets/${bucket}/objects`,
    path: (path: string) => "/" + path,
    upload: () => "/batch-upload",
    delete: () => "/batch-delete"
}
```

### UserRoutes
```typescript
const UserRoutes = {
    baseUrl: "api/users/",
    getCurrentUser: () => `${UserRoutes.baseUrl}me/`,
    updateUser: (username: string) => `${UserRoutes.baseUrl}${username}/`,
    deleteUser: (username: string) => `${UserRoutes.baseUrl}${username}/`,
    listUser: (filter: string) => `${UserRoutes.baseUrl}${filter}`
}
```

### FunctionRoutes
```typescript
const FunctionRoutes = {
    baseUrl: (appSlug: string, functionSlug: string) => `/api/functions/apps/${appSlug}/functions/${functionSlug}`
}
```

### SettingsRoutes
```typescript
const SettingsRoutes = {
    metadata: "api/settings/metadata/"
}
```

### SecretsRoutes
```typescript
const SecretsRoutes = {
    baseUrl: "api/secrets/",
    get: (key: string) => `api/secrets/${key}/`,
    update: (key: string) => `api/secrets/${key}/`
}
```

---

## Error Codes

```typescript
enum ErrorCode {
    // General errors (1000-1099)
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',

    // Network errors (1100-1199)
    NETWORK_ERROR = 'NETWORK_ERROR',
    CONNECTION_ERROR = 'CONNECTION_ERROR',
    REQUEST_FAILED = 'REQUEST_FAILED',

    // Authentication errors (1200-1299)
    AUTH_ERROR = 'AUTH_ERROR',
    UNAUTHORIZED = 'UNAUTHORIZED',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',
    TOKEN_INVALID = 'TOKEN_INVALID',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

    // Authorization errors (1300-1399)
    FORBIDDEN = 'FORBIDDEN',
    INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

    // Validation errors (1400-1499)
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT = 'INVALID_FORMAT',

    // Database errors (1500-1599)
    DATABASE_ERROR = 'DATABASE_ERROR',
    QUERY_FAILED = 'QUERY_FAILED',
    RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
    DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
    CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

    // Storage errors (1600-1699)
    STORAGE_ERROR = 'STORAGE_ERROR',
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    FILE_TOO_LARGE = 'FILE_TOO_LARGE',
    INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
    UPLOAD_FAILED = 'UPLOAD_FAILED',
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

    // Function errors (1700-1799)
    FUNCTION_ERROR = 'FUNCTION_ERROR',
    FUNCTION_NOT_FOUND = 'FUNCTION_NOT_FOUND',
    FUNCTION_EXECUTION_FAILED = 'FUNCTION_EXECUTION_FAILED',
    FUNCTION_TIMEOUT = 'FUNCTION_TIMEOUT',

    // Rate limiting errors (1800-1899)
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

    // Client errors (1900-1999)
    CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
    INVALID_API_KEY = 'INVALID_API_KEY',
    INVALID_CONFIG = 'INVALID_CONFIG'
}

enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

interface ErrorResponse {
    code: ErrorCode
    message: string
    severity: ErrorSeverity
    timestamp: string
    requestId?: string
    metadata?: Record<string, any>
    cause?: Error
}
```

---

## API Response Format

### List Response
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "age": 30,
      "user_id": 5,
      "user": {
        "id": 5,
        "name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ],
  "total": 156,
  "meta": {
    "offset": 0,
    "count": 10,
    "has_more": true
  }
}
```

### Single Record Response
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Insert failed",
  "detail": "Validation errors: age: must be >= 0"
}
```

---

## Utility Functions

```typescript
// Query string builder
function buildQueryString(filters: Record<string, unknown> | undefined): string {
    if (!filters || Object.keys(filters).length === 0) {
        return ''
    }
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.append(key, String(value))
        }
    })
    const queryString = params.toString()
    return queryString ? `?${queryString}` : ''
}

// Runtime detection
function isBrowser(): boolean
function isReactNative(): boolean
function getRuntimeEnvironment(): 'Browser' | 'ReactNative' | 'Server'
```

---

## Enums

```typescript
enum MimeTypeCategory {
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    APPLICATION = 'application',
    TEXT = 'text'
}

enum Visibility {
    PUBLIC = 'public',
    PRIVATE = 'private'
}

enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE'
}
```

---

## Key Design Patterns for Data Providers

1. **Query Builder Pattern**: Chainable methods returning new instances (immutable)
   ```typescript
   from(resource) -> filter(conditions) -> execute()
   ```

2. **Deferred Execution**: Operations are queued, executed on `.execute()`

3. **Route Builders**: Centralized endpoint construction with template functions

4. **Filter Objects**: DRF-style query parameters with operators (`field_operator=value`)

5. **Generic Types**: `<T>` for response typing

6. **HTTP Method Enum**: Type-safe operation selection

7. **Dependency Injection**: All services receive `Client` instance

---

## Implementation Status

| Service | Status | Completion | Notes |
|---------|--------|------------|-------|
| Client/HTTP | Complete | 90% | Core infrastructure working |
| User | Functional | 80% | CRUD operations implemented |
| Auth | Partial | 60% | Basic auth, SSO planned |
| Storage | Partial | 70% | Query builder working |
| Database | Planned | 0% | Query builder structure defined |
| Functions | Complete | 100% | Function execution working |
| Secrets | Complete | 100% | CRUD operations for secrets |
| Settings | Functional | 70% | Site config fetching works |

---

## Dependencies

**Peer Dependencies:**
- `axios`: ^1.0.0
- `@types/node`: ^18.0.0 || ^20.0.0 || ^22.0.0
- `mime-db`: ^1.54.0

**Dev Dependencies:**
- `typescript`: ^5.7.3

---

## Token Management

The SDK uses localStorage for JWT token storage in browser environments:

```typescript
class TokenClient {
    getToken(): string | null {
        if (isBrowser()) {
            return localStorage.getItem("jwt")
        }
        return null
    }
}
```

Authentication headers are automatically applied:
- API Key: `Authorization: Token {apiKey}` (developer auth)
- JWT: `Authorization: Bearer {jwt}` (user auth - takes precedence)

---

This reference document provides all necessary context for generating refined data providers that align with the Taruvi SDK's architecture, patterns, and API specifications.
