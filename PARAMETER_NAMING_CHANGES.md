# Parameter Naming Change: baseUrl → apiUrl

**Date**: 2026-01-22  
**Status**: ✅ Completed

## Changes Made

### Type Definitions

**File**: `src/types.ts`
- Changed `baseUrl: string` → `apiUrl: string`
- Updated comment: "Base API URL"

### Client Constructor

**File**: `src/client.ts`
- Updated validation: `config.baseUrl` → `config.apiUrl`
- Updated error message: "Base URL is required" → "API URL is required"

### HTTP Client

**File**: `src/lib-internal/http/HttpClient.ts`
- Updated all HTTP methods to use `config.apiUrl` instead of `config.baseUrl`:
  - `get()` method
  - `post()` method
  - `put()` method
  - `delete()` method
  - `patch()` method

### Auth Client

**File**: `src/lib/auth/AuthClient.ts`
- Updated `login()`: `config.deskUrl || config.baseUrl` → `config.deskUrl || config.apiUrl`
- Updated `signup()`: `config.baseUrl` → `config.apiUrl`
- Updated `logout()`: `config.deskUrl || config.baseUrl` → `config.deskUrl || config.apiUrl`
- Updated `refreshAccessToken()`: `config.baseUrl` → `config.apiUrl`

### Documentation

**File**: `README.md`
- Updated all examples: `baseUrl:` → `apiUrl:`
- Updated environment variable: `VITE_TARUVI_BASE_URL` → `VITE_TARUVI_API_URL`

## Build Status

✅ TypeScript compilation successful  
✅ No errors or warnings

## Alignment with Python SDK

This change aligns the JavaScript SDK with the Python SDK naming convention:

**Python SDK**:
```python
client = Client(
    api_url="https://api.taruvi.cloud",
    app_slug="my-app"
)
```

**JavaScript SDK** (now aligned):
```typescript
const client = new Client({
    apiUrl: "https://api.taruvi.cloud",
    appSlug: "my-app",
    apiKey: "your-api-key"
})
```

## Breaking Change

⚠️ **This is a breaking change**

Users must update their configuration:

```typescript
// ❌ Old (will break)
const client = new Client({
    baseUrl: "https://api.taruvi.cloud",
    appSlug: "my-app",
    apiKey: "key"
})

// ✅ New (correct)
const client = new Client({
    apiUrl: "https://api.taruvi.cloud",
    appSlug: "my-app",
    apiKey: "key"
})
```

## Migration Guide

1. Find all `baseUrl` references in your code
2. Replace with `apiUrl`
3. Update environment variables: `VITE_TARUVI_BASE_URL` → `VITE_TARUVI_API_URL`

## Next Steps

As per the SDK Alignment Analysis:

1. ✅ Module naming - COMPLETED
2. ✅ Parameter naming (baseUrl → apiUrl) - COMPLETED
3. ⏭️ Add direct CRUD methods to Database module
4. ⏭️ Remove `.execute()` requirement from Storage
5. ⏭️ Add missing methods to Functions module
