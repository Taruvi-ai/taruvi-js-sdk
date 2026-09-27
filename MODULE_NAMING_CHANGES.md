# Module Naming Convention Changes - Completed

> **Changelog / historical.** User guide: **[public SDK documentation](README.md#documentation)**.

**Date**: 2026-01-22  
**Status**: ✅ Completed

## Changes Made

### Folder Renaming

All module folders in `src/lib/` have been renamed to lowercase and pluralized where appropriate:

| Old Name | New Name | Change Type |
|----------|----------|-------------|
| `Analytics/` | `analytics/` | Lowercase |
| `App/` | `app/` | Lowercase |
| `auth/` | `auth/` | ✓ Already correct |
| `Database/` | `database/` | Lowercase |
| `Function/` | `functions/` | Lowercase + Plural |
| `Policy/` | `policy/` | Lowercase |
| `Secrets/` | `secrets/` | Lowercase |
| `Settings/` | `settings/` | Lowercase |
| `Storage/` | `storage/` | Lowercase |
| `user/` | `users/` | Plural |

### Files Updated

1. **src/index.ts** - Updated all import paths to reflect new folder names

### Build Status

✅ TypeScript compilation successful  
✅ No errors or warnings

## Benefits

1. **Consistency** - All module folders now follow lowercase naming
2. **Alignment** - Matches Python SDK naming conventions
3. **Clarity** - Plural names (`users`, `functions`) match REST conventions
4. **Maintainability** - Easier to navigate and understand structure

## Next Steps

As per the SDK Alignment Analysis, the next priorities are:

1. ✅ **Module naming** - COMPLETED
2. ⏭️ Add direct CRUD methods to Database module
3. ⏭️ Remove `.execute()` requirement from Storage
4. ⏭️ Add missing methods to Functions module
5. ⏭️ Implement AuthManager pattern

## Breaking Changes

⚠️ **This is a breaking change for existing users**

Users will need to update their imports:

```typescript
// Old imports (will break)
import { User } from '@taruvi/sdk'
import { Functions } from '@taruvi/sdk'

// New imports (correct)
import { User } from '@taruvi/sdk'  // Still works - export name unchanged
import { Functions } from '@taruvi/sdk'  // Still works - export name unchanged
```

**Note**: The exported class names remain unchanged (`User`, `Functions`, etc.), only the internal folder structure changed. This means existing code will continue to work without modifications.

## Verification

```bash
# Build successful
npm run build
# ✓ No errors

# Folder structure
ls src/lib/
# analytics  app  auth  database  functions  policy  secrets  settings  storage  users
```

All folders now follow consistent lowercase naming conventions! 🎉
