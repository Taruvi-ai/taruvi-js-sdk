# Advanced topics & troubleshooting

## TypeScript: `Database<T>`

Use a generic row type for safer CRUD and queries:

```typescript
interface Account {
  id: string
  name: string
  status: 'active' | 'archived'
}

const db = new Database<Account>(client)

const response = await db
  .from('accounts')
  .filters('status', 'eq', 'active')
  .execute()

// response.data is Account | Account[] (wrapped in TaruviResponse)
```

For PostgreSQL range columns, import `PgRangeValue` from `@taruvi/sdk` and use it on fields that store ranges.

Graph helpers:

- `GraphInclude`: `'descendants' | 'ancestors' | 'both'`
- `GraphFormat`: `'tree' | 'graph'`

---

## Storage filters

Pass a `StorageFilters` object to `.filter()`. Common fields (see [`src/types.ts`](../src/types.ts) for the full interface):

| Category | Examples |
|----------|----------|
| Pagination | `page`, `page_size` |
| Size (bytes) | `size__gte`, `size__lte`, `min_size`, `max_size` |
| Dates (ISO 8601) | `created_at__gte`, `created_before`, `updated_at__lte` |
| Search | `search`, `filename__icontains`, `prefix`, `file__startswith` |
| MIME | `mimetype`, `mimetype__in`, `mimetype_category` |
| Visibility | `visibility`: `'public'` \| `'private'` |
| User | `created_by_me`, `modified_by_me`, `created_by__username` |
| Sort | `ordering` |

`mimetype_category` accepts: `image`, `video`, `audio`, `application`, `text` (see `MimeTypeCategory` in [`src/utils/enums.ts`](../src/utils/enums.ts)).

```typescript
await new Storage(client)
  .from('uploads')
  .filter({
    mimetype_category: 'image',
    visibility: 'private',
    page: 1,
    page_size: 24,
    ordering: '-created_at',
  })
  .execute()
```

---

## User list filters

`User.list()` accepts optional `UserListFilters`:

| Field | Purpose |
|-------|---------|
| `search` | Search users |
| `is_active`, `is_staff`, `is_superuser`, `is_deleted` | Boolean filters |
| `roles` | Filter by role |
| `ordering` | Sort field(s) |
| `page`, `page_size` | Pagination |

```typescript
await new User(client).list({
  is_active: true,
  search: 'jane',
  page: 1,
  page_size: 50,
})
```

---

## Policy request shapes

`checkResource()` expects an array of:

```typescript
{
  resource: string      // e.g. 'datatable:accounts'
  recordId: string
  actions: string[]     // e.g. ['read', 'update', 'delete']
  attributes?: Record<string, unknown>
}
```

`getAllowedActions()` uses the Cerbos-style `Resource` shape: `{ kind, id, attr }`.

Optional `principal` and `auxData` on `getAllowedActions` override the default principal — see `GetAllowedActionsOptions` in exported types.

---

## Packaging & consumption

- **Build:** `npm run build` runs `tsc` and emits `dist/`.
- **package.json** may point `"main"` at source during local development; consumers typically use the built output or your package publish config.
- **Peer dependencies:** `axios`, `typescript`, optional `@types/node` — must be installed in the host app.
- **Releases:** Stable vs beta branches and CI/CD publishing — [Releases and branches](08-releases-and-branches.md).

---

## Troubleshooting

### Login redirect returns but user still appears logged out

1. Ensure `Client` is constructed **after** the redirect (or on the same page load that includes `#session_token=...`).
2. Check the browser URL had a hash with `session_token` before the SDK cleared it.
3. Call `auth.isUserAuthenticated()` or `auth.getSessionToken()` to verify storage.

### 401 on every API call after login

- Session token may be missing or expired — log in again.
- On 401, the SDK **clears** the stored token; redirect to login.
- Server apps: confirm `token` in `Client` config matches the user’s session.

### 403 but still “logged in”

- Expected: **403** means authenticated but not allowed. Token is **not** cleared (unlike 401).
- Use `Policy` or backend roles to fix permissions.

### `login()` does nothing

- `Auth.login()` only works in a **browser** (`window` required). Use config `token` on the server.

### `PATCH operation requires a record ID`

- Row updates need `.get(recordId).update(body)` before `.execute()`.
- Bulk row updates use `.bulkUpdate([...])` without a single record id in the path.

### CORS or cookies

- `HttpClient` uses `withCredentials: true`. Your API must allow credentials from your frontend origin if cookies are required.
- Session auth primarily uses `X-Session-Token`; align CORS to allow that header if needed.

### Wrong host or `//api/...` URLs (double slash)

For SDK maintainers and anyone reading internal HTTP code: [`HttpClient`](../src/lib-internal/http/HttpClient.ts) **prepends a `/` to the endpoint**. If the endpoint already starts with `/`, the final path becomes `//api/v4/users/logout` (double slash). When Axios sees a path starting with `//`, it treats it as a **protocol-relative URL**, which **bypasses `baseURL`**.

Use endpoints without a leading slash — e.g. `api/v4/users/logout`, not `/api/v4/users/logout`. See [Architecture — Endpoint paths and baseURL](03-architecture.md#endpoint-paths-and-baseurl-maintainers).

### `Storage.upload()` fails in Node

- Upload uses `File` and `FormData`. Use Node 18+ globals or a polyfill in non-browser environments.

---

## Historical / internal markdown

These files are **not** the user guide; use `docs/` instead:

| File | Note |
|------|------|
| [MODULE_NAMING_CHANGES.md](../MODULE_NAMING_CHANGES.md) | Changelog |
| [PARAMETER_NAMING_CHANGES.md](../PARAMETER_NAMING_CHANGES.md) | Changelog (`baseUrl` → `apiUrl`) |

---

## See also

- [API reference — Filter operators](05-api-reference.md#filter-operators-databasefilters)
- [Examples](06-examples.md)
