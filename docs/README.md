# Taruvi SDK Documentation

The Taruvi SDK (`@taruvi/sdk`) gives developers a consistent, typed way to query the Taruvi backend from TypeScript applications.

## Table of contents

| Guide | Description |
|-------|-------------|
| [01 — Introduction](01-introduction.md) | What the SDK is, installation, `Client` setup, DI, **backend login flow** |
| [02 — Builder pattern](02-builder-pattern.md) | Why every chain step returns a new instance, and how execution works |
| [03 — Architecture](03-architecture.md) | `lib` vs `lib-internal`, request flow, what gets exported |
| [04 — Clients](04-clients.md) | Overview of each service client and when to use it |
| [05 — API reference](05-api-reference.md) | Method-by-method reference for all public APIs |
| [06 — Examples](06-examples.md) | Chaining patterns and common workflows |
| [07 — Advanced & troubleshooting](07-advanced-topics.md) | Typing, storage filters, `apiKey`, CORS, historical docs |
| [08 — Releases & branches](08-releases-and-branches.md) | `main` vs `beta`, CI/CD publish, npm install tags |
| [09 — Contributing](09-contributing.md) | Dev setup, project structure, conventions, how to add clients/methods |

## Quick start

```typescript
import { Client, Database } from '@taruvi/sdk'

const client = new Client({
  apiKey: 'your-site-api-key',
  appSlug: 'your-app-slug',
  apiUrl: 'https://taruvi-site.taruvi.cloud',
})

const db = new Database(client)
const response = await db
  .from('accounts')
  .filters('status', 'eq', 'active')
  .sort('created_at', 'desc')
  .page(1)
  .pageSize(20)
  .execute()
```

## Additional resources

- [SDK design context](../SDK_DESIGN_CONTEXT.md) — backend API contract notes (for SDK ↔ API mapping)
- [Package README](../README.md) — install, version, and links to this documentation
