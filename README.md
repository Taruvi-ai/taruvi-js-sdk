# Taruvi SDK - AI Implementation Guide

> Quick reference for implementing Taruvi SDK features with copy-paste examples from production code

## Installation

```bash
npm install @taruvi/sdk
```

## What's New

Recent updates to the SDK:

- **Analytics Service**: New service for executing analytics queries with `execute()` method. Pass query name and parameters to run predefined analytics.
- **Policy Service**: New service for checking resource-level permissions with `checkResource()` method. Supports batch resource checking with entity types, tables, and attributes.
- **App Service**: New service to retrieve app roles with `roles()` method.
- **User Types**: Added `UserCreateRequest`, `UserResponse`, and `UserDataResponse` types for user management.
- **Auth Service**: Web UI Flow with `login()`, `signup()`, `logout()` methods that redirect to backend pages. Token refresh with rotation support, `getCurrentUser()` for JWT decoding.
- **Database Service**: Added `create()` method for creating records. Added `populate()` method for eager loading related records. Comprehensive filter support with Django-style operators (`__gte`, `__lte`, `__icontains`, etc.).
- **Storage Service**: Added `download()` method. Enhanced filter support with size, date, MIME type, visibility filters. `delete()` now accepts array of paths for bulk deletion.
- **Client**: Automatic token extraction from URL hash after OAuth callback - no manual token handling needed.
- **Types**: Comprehensive `StorageFilters` and `DatabaseFilters` interfaces with full operator support.

## Core Setup

### 1. Initialize Client

```typescript
import { Client } from '@taruvi/sdk'

const taruviClient = new Client({
  apiKey: "your-site-api-key",
  appSlug: "your-app-slug", 
  baseUrl: "https://taruvi-site.taruvi.cloud"
})
```

### 2. Pass to Components (React)

```typescript
// App.tsx
<Route path="/page" element={<MyPage taruviClient={taruviClient} />} />

// MyPage.tsx
interface MyPageProps {
  taruviClient: Client;
}

export default function MyPage({ taruviClient }: MyPageProps) {
  // Use SDK here
}
```

### 3. Automatic Token Handling

The Client automatically extracts authentication tokens from URL hash after OAuth callback:

```typescript
// After login redirect, URL contains:
// #session_token=xxx&access_token=yyy&refresh_token=zzz&expires_in=172800&token_type=Bearer

// Client automatically:
// 1. Extracts tokens from URL hash
// 2. Stores them in TokenClient
// 3. Clears the hash from URL

const taruviClient = new Client({ apiKey, appSlug, baseUrl })
// Tokens are now available automatically if present in URL hash
```

---

## Auth Service

### Check Authentication

```typescript
import { Auth } from '@taruvi/sdk'

const auth = new Auth(taruviClient)
const isAuthenticated = auth.isUserAuthenticated() // Returns boolean (synchronous)
```

### Login Flow (Web UI Flow with Redirect)

```typescript
import { useEffect } from "react"
import { Auth } from '@taruvi/sdk'

export default function Login({ taruviClient }) {
  const auth = new Auth(taruviClient)

  useEffect(() => {
    const isAuthenticated = auth.isUserAuthenticated()

    if (isAuthenticated) {
      window.location.href = "/dashboard"
    } else {
      // Redirects to backend login page, then returns with tokens in URL hash
      auth.login() // Optional: pass callback URL
    }
  }, [])

  return <div>Checking authentication...</div>
}
```

### Signup Flow

```typescript
import { Auth } from '@taruvi/sdk'

const auth = new Auth(taruviClient)

// Redirect to signup page (Web UI Flow)
auth.signup() // Optional: pass callback URL
auth.signup("/dashboard") // Redirect to dashboard after signup
```

### Logout

```typescript
import { Auth } from '@taruvi/sdk'

const auth = new Auth(taruviClient)

// Clear tokens and redirect to logout page
await auth.logout() // Optional: pass callback URL
await auth.logout("/") // Redirect to home after logout
```

### Get Current User

```typescript
import { Auth } from '@taruvi/sdk'

const auth = new Auth(taruviClient)

// Get user info from decoded JWT access token
const user = auth.getCurrentUser()
console.log(user?.user_id)
console.log(user?.username)
console.log(user?.email)
```

### Token Management

```typescript
import { Auth } from '@taruvi/sdk'

const auth = new Auth(taruviClient)

// Get tokens
const accessToken = auth.getAccessToken()
const refreshToken = auth.getRefreshToken()

// Check if token is expired
const isExpired = auth.isTokenExpired()

// Refresh access token (returns new access AND refresh tokens due to rotation)
const newTokens = await auth.refreshAccessToken()
if (newTokens) {
  console.log(newTokens.access)
  console.log(newTokens.refresh)
  console.log(newTokens.expires_in)
}
```

---

## User Service

### Get Current User

```typescript
import { User } from '@taruvi/sdk'

const user = new User(taruviClient)
const userData = await user.getUserData()

console.log(userData.data.username)
console.log(userData.data.email)
console.log(userData.data.full_name)
```

### Create User (Registration)

```typescript
import { User } from '@taruvi/sdk'

const user = new User(taruviClient)

const newUser = await user.createUser({
  username: "john_doe",
  email: "john@example.com",
  password: "secure123",
  confirm_password: "secure123",
  first_name: "John",
  last_name: "Doe",
  is_active: true,
  is_staff: false,
  attributes: ""
})
```

### Update User

```typescript
const user = new User(taruviClient)

await user.updateUser("john_doe", {
  email: "newemail@example.com",
  first_name: "Johnny"
})
```

### Delete User

```typescript
const user = new User(taruviClient)
await user.deleteUser("john_doe")
```

### List Users

```typescript
const user = new User(taruviClient)

const users = await user.list({
  search: "john",
  is_active: true,
  is_staff: false,
  is_superuser: false,
  is_deleted: false,
  ordering: "-date_joined",
  page: 1,
  page_size: 20
})
```

### Get User Apps

```typescript
const user = new User(taruviClient)
const apps = await user.getUserApps("john_doe")

// Returns array of apps the user has access to
apps.forEach(app => {
  console.log(app.name, app.slug, app.url)
})
```

### Complete Registration Form Example

```typescript
import { useState } from "react"
import { User } from "@taruvi/sdk"
import { useNavigate } from "react-router"

export default function Register({ taruviClient }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
    first_name: "",
    last_name: "",
    is_active: true,
    is_staff: false
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const userClient = new User(taruviClient)
      await userClient.createUser(formData)
      navigate("/login")
    } catch (err) {
      setError(err.message || "Failed to create user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="username"
        value={formData.username}
        onChange={(e) => setFormData({...formData, username: e.target.value})}
        required
      />
      {/* Add other fields */}
      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Register"}
      </button>
      {error && <div>{error}</div>}
    </form>
  )
}
```

---

## Database Service (CRUD Operations)

### Fetch All Records

```typescript
import { Database } from '@taruvi/sdk'

const db = new Database(taruviClient)
const response = await db.from("accounts").execute()

if (response.data) {
  console.log(response.data) // Array of records
}
```

### Fetch Single Record

```typescript
const db = new Database(taruviClient)
const record = await db.from("accounts").get("record-id").execute()
```

### Create Record

```typescript
const db = new Database(taruviClient)
await db.from("accounts").create({
  name: "John Doe",
  email: "john@example.com",
  status: "active"
}).execute()
```

### Update Record

```typescript
const db = new Database(taruviClient)
await db.from("accounts").get("record-id").update({
  name: "Updated Name",
  status: "active"
}).execute()
```

### Delete Record

```typescript
const db = new Database(taruviClient)
await db.from("accounts").delete("record-id").execute()
```

### Filter Records

```typescript
const db = new Database(taruviClient)

// Simple field filters
const filtered = await db
  .from("accounts")
  .filter({
    status: "active",
    country: "USA"
  })
  .execute()

// Advanced filters with operators
const advanced = await db
  .from("accounts")
  .filter({
    age__gte: 18,           // age >= 18
    age__lt: 65,            // age < 65
    name__icontains: "john", // case-insensitive contains
    created_at__gte: "2024-01-01",
    ordering: "-created_at"  // Sort by created_at descending
  })
  .execute()

// Pagination
const paginated = await db
  .from("accounts")
  .filter({
    page: 1,
    pageSize: 20
  })
  .execute()
```

### Populate Related Records

Use `populate()` to eager load related records (foreign key relationships):

```typescript
const db = new Database(taruviClient)

// Populate a single relation
const orders = await db
  .from("orders")
  .populate(["customer"])
  .execute()

// Each order now includes the full customer object instead of just the ID
console.log(orders.data[0].customer.name)
console.log(orders.data[0].customer.email)

// Populate multiple relations
const invoices = await db
  .from("invoices")
  .populate(["customer", "created_by", "items"])
  .execute()

// Combine with filters
const recentOrders = await db
  .from("orders")
  .filter({
    status: "completed",
    created_at__gte: "2024-01-01",
    ordering: "-created_at"
  })
  .populate(["customer", "product"])
  .execute()

// Combine with pagination
const paginatedOrders = await db
  .from("orders")
  .filter({ page: 1, pageSize: 10 })
  .populate(["customer"])
  .execute()
```

### Complete CRUD Example (CRM Table)

```typescript
import { useEffect, useState } from 'react'
import { Database } from '@taruvi/sdk'

export default function CrmTable({ taruviClient }) {
  const [contacts, setContacts] = useState([])

  const fetchContacts = async () => {
    const db = new Database(taruviClient)
    const response = await db.from("accounts").execute()
    if (response.data) {
      setContacts(response.data)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const handleCreate = async (data) => {
    const db = new Database(taruviClient)
    await db.from("accounts").create(data).execute()
    fetchContacts() // Refresh
  }

  const handleDelete = async (id) => {
    const db = new Database(taruviClient)
    await db.from("accounts").delete(id).execute()
    fetchContacts() // Refresh
  }

  const handleUpdate = async (id, data) => {
    const db = new Database(taruviClient)
    await db.from("accounts").get(id).update(data).execute()
    fetchContacts() // Refresh
  }

  return (
    <div>
      <button onClick={() => handleCreate({ name: 'New Contact', status: 'active' })}>
        Add Contact
      </button>
      <table>
        {contacts.map(contact => (
          <tr key={contact.id}>
            <td>{contact.name}</td>
            <td>
              <button onClick={() => handleUpdate(contact.id, { status: 'updated' })}>
                Edit
              </button>
              <button onClick={() => handleDelete(contact.id)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </table>
    </div>
  )
}
```

---

## Storage Service (File Management)

### List Files in Bucket

```typescript
import { Storage } from '@taruvi/sdk'

const storage = new Storage(taruviClient)
const files = await storage.from("documents").execute()

console.log(files.data) // Array of file objects
```

### Upload Files

```typescript
const storage = new Storage(taruviClient)

const filesData = {
  files: [file1, file2], // File objects from input
  metadatas: [{ name: "file1" }, { name: "file2" }],
  paths: ["file1.pdf", "file2.pdf"]
}

await storage.from("documents").upload(filesData).execute()
```

### Download File

```typescript
const storage = new Storage(taruviClient)
const file = await storage.from("documents").download("path/to/file.pdf").execute()
```

### Delete Files

```typescript
const storage = new Storage(taruviClient)

// Delete single file
await storage.from("documents").delete(["path/to/file.pdf"]).execute()

// Delete multiple files
await storage.from("documents").delete([
  "path/to/file1.pdf",
  "path/to/file2.pdf",
  "path/to/file3.pdf"
]).execute()
```

### Update File Metadata

```typescript
const storage = new Storage(taruviClient)
await storage
  .from("documents")
  .update("path/to/file.pdf", {
    filename: "newname.pdf",
    visibility: "public",
    metadata: { category: "reports" }
  })
  .execute()
```

### Filter Files

```typescript
const storage = new Storage(taruviClient)

// Basic filters
const filtered = await storage
  .from("documents")
  .filter({
    search: "invoice",
    visibility: "public",
    mimetype_category: "document",
    min_size: 1024,
    ordering: "-created_at"
  })
  .execute()

// Advanced filters with operators
const advanced = await storage
  .from("documents")
  .filter({
    // Size filters (bytes)
    size__gte: 1024,           // >= 1KB
    size__lte: 10485760,       // <= 10MB

    // Date filters (ISO 8601)
    created_at__gte: "2024-01-01",
    created_at__lte: "2024-12-31",

    // Search filters
    filename__icontains: "report",
    file__startswith: "invoice",
    prefix: "uploads/2024/",

    // MIME type filters
    mimetype: "application/pdf",
    mimetype_category: "image",  // image, document, video, audio, etc.

    // Visibility & user filters
    visibility: "public",
    created_by_me: true,
    created_by__username: "john",

    // Pagination & sorting
    page: 1,
    pageSize: 50,
    ordering: "-created_at"  // Sort by created_at descending
  })
  .execute()
```

### Complete File Upload Example

```typescript
import { useState, useRef } from 'react'
import { Storage } from '@taruvi/sdk'

export default function FileUploader({ taruviClient }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    setFiles(selectedFiles)
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    try {
      const storage = new Storage(taruviClient)

      const uploadData = {
        files: files,
        metadatas: files.map(f => ({ name: f.name })),
        paths: files.map(f => f.name)
      }

      await storage.from("documents").upload(uploadData).execute()

      alert("Upload successful!")
      setFiles([])
    } catch (error) {
      alert("Upload failed: " + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
      />
      <button onClick={uploadFiles} disabled={uploading || files.length === 0}>
        {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
      </button>
    </div>
  )
}
```

---

## Functions Service (Serverless)

### Execute Function (Sync)

```typescript
import { Functions } from '@taruvi/sdk'

const functions = new Functions(taruviClient)

const result = await functions.execute("my-function", {
  async: false,
  params: {
    key1: "value1",
    key2: 123
  }
})

console.log(result.data) // Function response
```

### Execute Function (Async)

```typescript
const functions = new Functions(taruviClient)

const result = await functions.execute("long-running-task", {
  async: true,
  params: { data: "value" }
})

console.log(result.invocation.invocation_id) // Track async execution
console.log(result.invocation.celery_task_id)
console.log(result.invocation.status)
```

### Complete Function Executor Example

```typescript
import { useState } from 'react'
import { Functions } from '@taruvi/sdk'

export default function FunctionExecutor({ taruviClient }) {
  const [functionSlug, setFunctionSlug] = useState("")
  const [params, setParams] = useState({})
  const [isAsync, setIsAsync] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const executeFunction = async () => {
    setLoading(true)
    try {
      const functions = new Functions(taruviClient)
      const response = await functions.execute(functionSlug, {
        async: isAsync,
        params: params
      })
      setResult(response)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        placeholder="Function slug"
        value={functionSlug}
        onChange={(e) => setFunctionSlug(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={isAsync}
          onChange={(e) => setIsAsync(e.target.checked)}
        />
        Async
      </label>
      <button onClick={executeFunction} disabled={loading}>
        Execute
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
```

---

## Analytics Service

### Execute Analytics Query

```typescript
import { Analytics } from '@taruvi/sdk'

const analytics = new Analytics(taruviClient)

const result = await analytics.execute("monthly-sales-report", {
  params: {
    start_date: "2024-01-01",
    end_date: "2024-12-31"
  }
})

console.log(result.data) // Analytics query result
```

### Execute with Typed Response

```typescript
interface SalesData {
  total_sales: number
  orders_count: number
  average_order_value: number
}

const analytics = new Analytics(taruviClient)

const result = await analytics.execute<SalesData>("sales-summary", {
  params: { period: "monthly" }
})

console.log(result.data?.total_sales)
console.log(result.data?.orders_count)
```

### Complete Analytics Dashboard Example

```typescript
import { useEffect, useState } from 'react'
import { Analytics } from '@taruvi/sdk'

export default function AnalyticsDashboard({ taruviClient }) {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const analytics = new Analytics(taruviClient)
        const result = await analytics.execute("dashboard-metrics", {
          params: {
            date_range: "last_30_days"
          }
        })
        setMetrics(result.data)
      } catch (error) {
        console.error("Failed to fetch analytics:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (loading) return <div>Loading analytics...</div>

  return (
    <div>
      <h2>Dashboard Metrics</h2>
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </div>
  )
}
```

---

## Settings Service

### Get Site Settings

```typescript
import { Settings } from '@taruvi/sdk'

const settings = new Settings(taruviClient)
const config = await settings.get()

console.log(config) // Site configuration object
```

---

## Secrets Service

### List Secrets

```typescript
import { Secrets } from '@taruvi/sdk'

const secrets = new Secrets(taruviClient)
const result = await secrets.list().execute()

console.log(result.items) // Array of secrets
```

### Get Secret

```typescript
const secrets = new Secrets(taruviClient)
const secret = await secrets.get("MY_SECRET_KEY").execute()

console.log(secret) // Secret object with value
```

### Update Secret

```typescript
const secrets = new Secrets(taruviClient)

await secrets.update("MY_SECRET", {
  value: {
    hostname: "db.example.com",
    port_number: 3306,
    username: "admin",
    password: "secret123"
  },
  tags: ["mysql", "production"],
  secret_type: "Mysql"
}).execute()
```

---

## Policy Service (Resource Permissions)

### Check Resource Permissions

```typescript
import { Policy } from '@taruvi/sdk'

const policy = new Policy(taruviClient)

// Check permissions for multiple resources
const result = await policy.checkResource([
  {
    entityType: "crm",
    tableName: "accounts",
    recordId: "record-123",
    attributes: { owner_id: "user-456" },
    actions: ["read", "update"]
  },
  {
    entityType: "docs",
    tableName: "documents",
    recordId: "doc-789",
    attributes: {},
    actions: ["delete"]
  }
])
```

### Complete Permission Check Example

```typescript
import { useState, useEffect } from 'react'
import { Policy } from '@taruvi/sdk'

export default function ResourceGuard({ taruviClient, children, resource }) {
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const policy = new Policy(taruviClient)
        const result = await policy.checkResource([
          {
            entityType: resource.entityType,
            tableName: resource.table,
            recordId: resource.id,
            attributes: resource.attributes || {},
            actions: ["read"]
          }
        ])
        setAllowed(result.allowed)
      } catch (error) {
        console.error("Permission check failed:", error)
        setAllowed(false)
      } finally {
        setLoading(false)
      }
    }
    checkPermission()
  }, [resource])

  if (loading) return <div>Checking permissions...</div>
  if (!allowed) return <div>Access denied</div>
  return children
}
```

---

## App Service

### Get App Roles

```typescript
import { App } from '@taruvi/sdk'

const app = new App(taruviClient)
const roles = await app.roles().execute()

console.log(roles) // Array of role objects with id, name, permissions
```

### Complete Roles List Example

```typescript
import { useEffect, useState } from 'react'
import { App } from '@taruvi/sdk'

export default function RolesList({ taruviClient }) {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const app = new App(taruviClient)
        const response = await app.roles().execute()
        setRoles(response.data || [])
      } catch (error) {
        console.error("Failed to fetch roles:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchRoles()
  }, [])

  if (loading) return <div>Loading roles...</div>

  return (
    <ul>
      {roles.map(role => (
        <li key={role.id}>
          <strong>{role.name}</strong>
          <span>{role.permissions?.join(", ")}</span>
        </li>
      ))}
    </ul>
  )
}
```

---

## Common Patterns

### Loading States

```typescript
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    try {
      const db = new Database(taruviClient)
      const response = await db.from("table").execute()
      setData(response.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  fetchData()
}, [])

if (loading) return <div>Loading...</div>
if (error) return <div>Error: {error}</div>
return <div>{/* Render data */}</div>
```

### Error Handling

```typescript
try {
  const user = new User(taruviClient)
  await user.createUser(data)
} catch (error) {
  if (error.response?.status === 400) {
    console.error("Validation error:", error.response.data)
  } else if (error.response?.status === 401) {
    console.error("Unauthorized")
  } else {
    console.error("Unknown error:", error.message)
  }
}
```

### Refresh Data After Mutation

```typescript
const [items, setItems] = useState([])

const fetchItems = async () => {
  const db = new Database(taruviClient)
  const response = await db.from("items").execute()
  setItems(response.data || [])
}

const createItem = async (data) => {
  const db = new Database(taruviClient)
  await db.from("items").create(data).execute()
  await fetchItems() // Refresh list
}

const deleteItem = async (id) => {
  const db = new Database(taruviClient)
  await db.from("items").delete(id).execute()
  await fetchItems() // Refresh list
}

const updateItem = async (id, data) => {
  const db = new Database(taruviClient)
  await db.from("items").get(id).update(data).execute()
  await fetchItems() // Refresh list
}
```

---

## TypeScript Types

### Import Types

```typescript
import type {
  TaruviConfig,
  AuthTokens,
  UserCreateRequest,
  UserResponse,
  UserDataResponse,
  FunctionRequest,
  FunctionResponse,
  FunctionInvocation,
  DatabaseRequest,
  DatabaseResponse,
  DatabaseFilters,
  StorageRequest,
  StorageUpdateRequest,
  StorageResponse,
  StorageFilters,
  SettingsResponse,
  SecretRequest,
  SecretResponse,
  Principal,
  Resource,
  Resources,
  RoleResponse,
  AnalyticsRequest,
  AnalyticsResponse
} from '@taruvi/sdk'
```

### Type Usage

```typescript
const config: TaruviConfig = {
  apiKey: "key",
  appSlug: "app",
  baseUrl: "https://api.taruvi.cloud",
  deskUrl: "https://desk.taruvi.cloud", // optional
  token: "existing-token" // optional
}

const userData: UserCreateRequest = {
  username: "john",
  email: "john@example.com",
  password: "pass123",
  confirm_password: "pass123",
  first_name: "John",
  last_name: "Doe",
  is_active: true,
  is_staff: false
}

// Database filters with operators
const dbFilters: DatabaseFilters = {
  page: 1,
  pageSize: 20,
  ordering: "-created_at",
  status: "active",
  age__gte: 18,
  name__icontains: "john"
}

// Storage filters with comprehensive options
const storageFilters: StorageFilters = {
  page: 1,
  pageSize: 50,
  search: "invoice",
  visibility: "public",
  mimetype_category: "document",
  size__gte: 1024,
  size__lte: 10485760,
  created_at__gte: "2024-01-01",
  ordering: "-created_at",
  created_by_me: true
}

// Policy types for permission checking
const principal: Principal = {
  id: "user-123",
  roles: ["admin", "editor"],
  attr: { department: "engineering" }
}

const resources: Resources = [
  {
    entityType: "crm",
    tableName: "accounts",
    recordId: "acc-456",
    attributes: { owner_id: "user-123" },
    actions: ["read", "update", "delete"]
  }
]
```

---

## Filter Operators Reference

### Database Filter Operators (Django-style)

The Database service supports Django-style field lookups:

| Operator | Description | Example |
|----------|-------------|---------|
| `field` | Exact match | `{ status: "active" }` |
| `field__gte` | Greater than or equal | `{ age__gte: 18 }` |
| `field__gt` | Greater than | `{ age__gt: 17 }` |
| `field__lte` | Less than or equal | `{ age__lte: 65 }` |
| `field__lt` | Less than | `{ age__lt: 66 }` |
| `field__icontains` | Case-insensitive contains | `{ name__icontains: "john" }` |
| `field__contains` | Case-sensitive contains | `{ name__contains: "John" }` |
| `field__istartswith` | Case-insensitive starts with | `{ email__istartswith: "admin" }` |
| `field__startswith` | Case-sensitive starts with | `{ code__startswith: "PRE" }` |
| `field__iendswith` | Case-insensitive ends with | `{ domain__iendswith: ".com" }` |
| `field__endswith` | Case-sensitive ends with | `{ filename__endswith: ".pdf" }` |
| `field__in` | Value in list | `{ status__in: ["active", "pending"] }` |
| `field__isnull` | Is null check | `{ deleted_at__isnull: true }` |
| `ordering` | Sort results | `{ ordering: "-created_at" }` (- for desc) |
| `page` | Page number | `{ page: 1 }` |
| `pageSize` | Items per page | `{ pageSize: 20 }` |

### Populate (Eager Loading)

Use the `populate()` method to eager load related records:

```typescript
// Populate accepts an array of relation field names
db.from("orders").populate(["customer", "items"]).execute()

// This adds ?populate=customer,items to the query string
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `populate` | `string[]` | Array of relation field names to eager load |

### Storage Filter Options

The Storage service supports these specialized filters:

| Category | Filters | Description |
|----------|---------|-------------|
| **Size** | `size__gte`, `size__lte`, `size__gt`, `size__lt`, `min_size`, `max_size` | Filter by file size in bytes |
| **Dates** | `created_at__gte`, `created_at__lte`, `created_after`, `created_before`, `updated_at__gte`, `updated_at__lte` | Filter by dates (ISO 8601 format) |
| **Search** | `search`, `filename__icontains`, `prefix`, `file`, `file__icontains`, `file__startswith`, `file__istartswith`, `metadata_search` | Search for files |
| **MIME Type** | `mimetype`, `mimetype__in`, `mimetype_category` | Filter by file type (document, image, video, audio, etc.) |
| **Visibility** | `visibility` | Filter by public/private visibility |
| **User** | `created_by_me`, `modified_by_me`, `created_by__username`, `created_by__username__icontains` | Filter by user |
| **Pagination** | `page`, `pageSize` | Paginate results |
| **Sorting** | `ordering` | Sort results (e.g., "-created_at") |

---

## Quick Reference

| Service | Import | Purpose |
|---------|--------|---------|
| `Client` | `import { Client }` | Main SDK client |
| `Auth` | `import { Auth }` | Authentication |
| `User` | `import { User }` | User management |
| `Database` | `import { Database }` | App data CRUD |
| `Storage` | `import { Storage }` | File management |
| `Functions` | `import { Functions }` | Serverless functions |
| `Settings` | `import { Settings }` | Site configuration |
| `Secrets` | `import { Secrets }` | Sensitive data |
| `Policy` | `import { Policy }` | Resource permissions |
| `App` | `import { App }` | App roles & config |
| `Analytics` | `import { Analytics }` | Analytics queries |

---

## Chaining Pattern

All query-building services use method chaining:

```typescript
// Database
const db = new Database(taruviClient)
await db.from("table").get("id").update(data).execute()
await db.from("table").filter({ status: "active" }).execute()
await db.from("table").filter({ page: 1 }).populate(["related_field"]).execute()
await db.from("table").create({ name: "New" }).execute()

// Storage
const storage = new Storage(taruviClient)
await storage.from("bucket").delete(["path/to/file.pdf"]).execute()
await storage.from("bucket").filter({ search: "query" }).execute()
await storage.from("bucket").download("path/to/file.pdf").execute()
```

**Always call `.execute()` at the end to run the query!**

---

## Environment Variables

```env
VITE_TARUVI_API_KEY=your-api-key
VITE_TARUVI_APP_SLUG=your-app
VITE_TARUVI_BASE_URL=https://taruvi-site.taruvi.cloud
```

```typescript
const client = new Client({
  apiKey: import.meta.env.VITE_TARUVI_API_KEY,
  appSlug: import.meta.env.VITE_TARUVI_APP_SLUG,
  baseUrl: import.meta.env.VITE_TARUVI_BASE_URL
})
```

---

**Generated from production code examples • Last updated: 2026-01-05**
