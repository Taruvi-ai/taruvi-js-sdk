# API reference

Method-by-method reference for all public SDK APIs. Types are exported from `@taruvi/sdk` — see [`src/index.ts`](../src/index.ts) for the full type list.

---

## `Client`

| Method | Returns | Description |
|--------|---------|-------------|
| `constructor(config: TaruviConfig)` | `Client` | Validates config; wires HTTP and token clients; extracts URL hash token in browser |
| `getConfig()` | `Readonly<TaruviConfig>` | Copy of apiKey, appSlug, apiUrl, deskUrl, token |

**`TaruviConfig`:** `apiKey`, `appSlug`, `apiUrl` (required); `deskUrl`, `token` (optional).

---

## `Database` (builder)

Generic row type: `Database<T>`. Entry: `new Database(client)`.

### Scope

| Method | Returns | Description |
|--------|---------|-------------|
| `from(dataTables)` | `Database<U>` | Set target table name |
| `edges()` | `Database<T>` | Switch to edges API (`{table}_edges`) |

### Graph traversal

| Method | Returns | Description |
|--------|---------|-------------|
| `include(direction)` | `Database<T>` | `'descendants'`, `'ancestors'`, or `'both'` |
| `depth(n)` | `Database<T>` | Max traversal depth |
| `format(fmt)` | `Database<T>` | Graph response format |
| `types(types)` | `Database<T>` | Filter by relationship type names |

### Query

| Method | Returns | Description |
|--------|---------|-------------|
| `filters(tree)` | `Database<T>` | JSON filter tree (`filters` query param) |
| `filters(field, operator, value)` | `Database<T>` | Flat DRF-style filter (`field__operator`) |
| `orderBy(field, order?)` | `Database<T>` | Sort one column (`asc` / `desc`). Accumulates on chain. |
| `orderBy(fields[])` | `Database<T>` | Sort multiple columns |
| `orderBy(rawString)` | `Database<T>` | Raw `ordering` string (e.g. `-salary,hire_date`) |
| `page(num)` | `Database<T>` | Page number |
| `pageSize(size)` | `Database<T>` | Page size |
| `populate(relations)` | `Database<T>` | Eager-load relations (comma-joined) |
| `populateAll()` | `Database<T>` | Populate all first-level relations (`*`) |
| `search(query)` | `Database<T>` | Full-text search |
| `fields(columns)` | `Database<T>` | Restrict selected columns |
| `allowedActions(actions)` | `Database<T>` | Request allowed actions in response. Accumulates on chain. |
| `aggregate(...expressions)` | `Database<T>` | Aggregate expressions. Accumulates on chain. |
| `groupBy(...fields)` | `Database<T>` | GROUP BY fields. Accumulates on chain. |
| `having(condition)` | `Database<T>` | HAVING clause. Accumulates on chain. |

### CRUD

| Method | Returns | Description |
|--------|---------|-------------|
| `get(recordId)` | `Database<T>` | GET single record |
| `create(body)` | `Database<T>` | POST create (single, array, or edges) |
| `upsert(body, uniqueFields?)` | `Database<T>` | POST upsert |
| `update(body)` | `Database<T>` | PATCH record (requires `.get(id)` first for rows) |
| `bulkUpdate(body)` | `Database<T>` | PATCH multiple records |
| `delete(recordId)` | `Database<T>` | DELETE single record |
| `delete(edgeIds)` | `Database<T>` | DELETE edges by ID array |
| `bulkDelete(ids)` | `Database<T>` | DELETE by comma-separated IDs |
| `deleteFiltered()` | `Database<T>` | DELETE rows matching current filters |

### Terminals

| Method | Returns | Description |
|--------|---------|-------------|
| `execute()` | `Promise<TaruviResponse<T \| T[]>>` | Run the built request |
| `first()` | `Promise<T \| null>` | Execute list GET; return first row |
| `count()` | `Promise<number>` | Execute; return `total` or array length |

---

## `Storage` (builder)

Entry: `new Storage(client)`.

| Method | Returns | Description |
|--------|---------|-------------|
| `from(bucket)` | `Storage` | Set bucket name |
| `getUrl(path)` | `string` | Get the full API URL for a stored file (no HTTP request) |
| `filter(filters)` | `Storage` | List filters (size, date, MIME, search, pagination, …) |
| `upload({ files, paths, metadatas })` | `Storage` | POST multipart upload |
| `download(path)` | `Storage` | GET file as `Blob` |
| `delete(paths)` | `Storage` | POST bulk delete by paths |
| `update(path, body)` | `Storage` | PUT metadata update |
| `metadata(path)` | `Storage` | GET object metadata only |
| `execute()` | `Promise<...>` | Run operation (return type varies: list, blob, upload/delete batch) |

**`StorageFilters`:** pagination, size/date ranges, search, MIME, visibility, ordering — see [`src/types.ts`](../src/types.ts).

---

## `App` (builder)

Entry: `new App(client)`.

| Method | Returns | Description |
|--------|---------|-------------|
| `roles()` | `App` | GET app roles |
| `settings()` | `App` | GET app settings |
| `execute()` | `Promise<unknown>` | Run GET request |

---

## `Secrets` (mixed)

Entry: `new Secrets(client)`.

| Method | Returns | Description |
|--------|---------|-------------|
| `get(key, options?)` | `Secrets` | Builder: fetch one secret (`options.app`, `options.tags`) |
| `list(keys, options?)` | `Promise<SecretsBatchResponse \| SecretsBatchMetadataResponse>` | Direct: batch fetch by keys |
| `execute()` | `Promise<T>` | Run built `get()` request |

---

## `Auth` (direct)

| Method | Returns | Description |
|--------|---------|-------------|
| `login(callbackUrl?)` | `void` | Browser redirect to login |
| `signup(callbackUrl?)` | `void` | Browser redirect to signup |
| `logout(callbackUrl?)` | `Promise<void>` | Clear token; redirect to logout |
| `isUserAuthenticated()` | `boolean` | Session token present |
| `getSessionToken()` | `string \| null` | Current session token |
| `getCurrentUser()` | `Promise<TaruviResponse<UserData> \| null>` | Current user profile |

---

## `User` (direct)

| Method | Returns | Description |
|--------|---------|-------------|
| `createUser(userData)` | `Promise<UserResponse>` | Create user |
| `getUser(username)` | `Promise<UserResponse>` | Get user by username |
| `updateUser(username, body)` | `Promise<UserResponse>` | Update user |
| `deleteUser(username)` | `Promise<void>` | Delete user |
| `list(filters?)` | `Promise<UserListResponse>` | List users |
| `getUserApps(username)` | `Promise<UserAppsResponse>` | Apps for a user |
| `assignRoles(request)` | `Promise<RolesResponse>` | Assign roles |
| `revokeRoles(request)` | `Promise<RolesResponse>` | Revoke roles |
| `getPreferences()` | `Promise<UserPreferencesResponse>` | Current user preferences |
| `updatePreferences(body)` | `Promise<UserPreferencesResponse>` | Update preferences |

---

## `Functions` (direct)

| Method | Returns | Description |
|--------|---------|-------------|
| `execute(functionSlug, options?)` | `Promise<FunctionResponse<T>>` | Invoke function (`options.async`, `options.params`) |

---

## `Analytics` (direct)

| Method | Returns | Description |
|--------|---------|-------------|
| `execute(querySlug, options?)` | `Promise<AnalyticsResponse<T>>` | Run analytics query (`options.params`) |

---

## `Settings` (direct)

| Method | Returns | Description |
|--------|---------|-------------|
| `get()` | `Promise<T>` | Site metadata |
| `getUserAttributes()` | `Promise<T>` | User attribute schema |
| `updateUserAttributes(schema)` | `Promise<T>` | Update user attribute schema |

---

## `Policy` (direct)

| Method | Returns | Description |
|--------|---------|-------------|
| `checkResource(resources)` | `Promise<PolicyCheckBatchResult>` | Batch permission check |
| `getAllowedActions(resource, options?)` | `Promise<string[]>` | Allowed action names for one resource |

**`Resources`:** array of `{ resource, recordId, actions, attributes? }`.

---

## Exported errors

| Export | When thrown |
|--------|-------------|
| `TaruviError` | Base error |
| `ValidationError` | 400 |
| `AuthError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `TimeoutError` | Timeout |
| `NetworkError` | Network failure |
| `RateLimitError` | Rate limited |
| `ErrorCode` | Enum of error codes |
| `createErrorFromResponse` | Factory (advanced) |

---

## Exported types (summary)

Import from `@taruvi/sdk`:

- **Core:** `TaruviConfig`, `TaruviResponse`, `PaginationInfo`, `StorageFilters`, `DatabaseFilters`
- **Auth:** `AuthTokens`
- **User:** `UserCreateRequest`, `UserResponse`, `UserListResponse`, role/preference types, …
- **Database:** `FilterOperator`, `SortOrder`, `GraphInclude`, `BackendFilterTreeRoot`, `PgRangeValue`, edge types, …
- **Storage:** `StorageObject`, upload/delete batch types, …
- **Policy, App, Functions, Settings, Secrets, Analytics:** see `src/index.ts`

**Utility:** `isBackendFilterTreeRoot` — type guard for JSON filter trees.

---

## Filter operators (`Database.filters`)

Flat filters: `filters('field', operator, value)` → query key `field` (when `eq`) or `field__operator`.

```typescript
.filters('status', 'eq', 'active')      // ?status=active
.filters('age', 'gte', 18)              // ?age__gte=18
.filters('name', 'icontains', 'acme')   // ?name__icontains=acme
```

### Comparison

| Operator | Meaning |
|----------|---------|
| `eq` | Equal |
| `ne` | Not equal |
| `gt`, `gte`, `lt`, `lte` | Greater / less (or equal) |

### Array / membership

| Operator | Meaning |
|----------|---------|
| `in`, `nin` | In / not in list |
| `ina`, `nina` | In / not in (case-insensitive) |

### String contains

| Operator | Meaning |
|----------|---------|
| `contains`, `ncontains` | Substring (case-insensitive, ILIKE) |
| `containss`, `ncontainss` | Substring (case-sensitive) |
| `icontains`, `nicontains` | Aliases for contains / ncontains |

### Starts / ends with

| Operator | Meaning |
|----------|---------|
| `startswith`, `nstartswith` | Starts with (case-insensitive) |
| `startswiths`, `nstartswiths` | Starts with (case-sensitive) |
| `endswith`, `nendswith` | Ends with (case-insensitive) |
| `endswiths`, `nendswiths` | Ends with (case-sensitive) |

### Range & null

| Operator | Meaning |
|----------|---------|
| `between`, `nbetween` | Between two values |
| `null`, `nnull` | Is null / is not null |

### Search & pattern

| Operator | Meaning |
|----------|---------|
| `search` | Full-text search |
| `like`, `ilike` | SQL LIKE / ILIKE |

### PostgreSQL arrays

| Operator | Meaning |
|----------|---------|
| `acontains`, `nacontains` | Array contains all |
| `acontainedby`, `nacontainedby` | Array contained by |
| `aoverlap`, `naoverlap` | Arrays overlap |
| `aelement`, `naelement` | Value in / not in array |

### PostgreSQL ranges

| Operator | Meaning |
|----------|---------|
| `rcontains`, `rcontainedby`, `roverlaps` | Range contains / contained / overlaps |
| `radjacent`, `rstrictleft`, `rstrictright` | Range adjacency / ordering |

Full list matches `FilterOperator` in [`src/lib/database/types.ts`](../src/lib/database/types.ts).

### JSON filter tree

For complex AND/OR logic, use `filters(tree)` with `BackendFilterTreeRoot` — root is an array of `{ operator: 'and' | 'or', value: [...] }` nodes; leaves are `{ field, operator, value }` using **backend** operator tokens. Use `isBackendFilterTreeRoot()` to validate at runtime.

---

## Next steps

[Examples](06-examples.md) — practical chaining patterns.
