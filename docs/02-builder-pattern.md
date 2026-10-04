# Builder design

`Database`, `Storage`, `App`, and `Secrets.get()` describe requests with new
builder instances. Their `execute()` methods send the requests. Direct clients
such as `User`, `Functions`, and `Analytics`, and the `Secrets.list()` method,
perform the call immediately when invoked.

## Why builders return new instances

A base query can be reused for independent requests. A method must not change
its receiver's query or path while creating a sibling:

```typescript
import {Database} from '@taruvi/sdk'
import type {Client} from '@taruvi/sdk'

declare const client: Client
const accounts = new Database(client).from('accounts')
const active = accounts.filters('status', 'eq', 'active')
const sorted = accounts.sort('name', 'asc')

await active.execute()
await sorted.execute()
```

The first request includes `status=active`; the second includes `ordering=name`
and does not inherit the first request's filter. The same rule applies to
storage filters and graph traversals. These cases are covered by
[builder immutability tests](../tests/unit/edge-cases/robustness.test.ts).

The shared `Client` still owns mutable session state. Builder constructors also
retain some payload and option references: this is request-state branching,
not deep cloning or freezing of caller-owned objects.

## Database state and transitions

[`DatabaseClient.ts`](../src/lib/database/DatabaseClient.ts) holds:

| State | Purpose |
| --- | --- |
| `urlParams` | Table and optional record ID |
| `queryParams` | Filters, ordering, pagination, projection, and aggregates |
| `graphParams` | Traversal direction, depth, format, and relationship types |
| `operation`, `body` | HTTP method and write payload |
| `isEdges`, `isUpsert` | Edge-table selection and upsert route suffix |

Review every constructor call when adding state. Forwarding only the query
parameters can silently lose a method, body, or routing flag.

Current transitions are deliberately explicit:

- `from<U>(table)` selects the table and record type `U`. It resets
  query/graph state and the selected operation; do not assume a preceding
  `Database<T>` type argument carries through `from()`.
- Methods such as `filters`, `sort`, `page`, and `pageSize` construct a read
  builder, resetting the operation and body. Put write operations after query
  configuration, immediately before `execute()`.
- `get(id)` selects a record; `get(id).update(body)` selects a detail PATCH.
- `sort`, `aggregate`, `groupBy`, `having`, and `allowedActions` append to their
  comma-separated parameters. `page`, `pageSize`, `search`, and repeated flat
  filter keys replace the previous value. Use `filters(tree)` with an explicit
  AND group to retain multiple conditions for the same field. Flat list values
  use commas as separators; use the JSON tree overload when an individual
  value contains a literal comma or needs its JSON type preserved.
- `deleteFiltered()` converts filter conditions into the `filter` JSON
  parameter. It rejects an empty filter and selection modifiers it cannot
  honor, including search, pagination, and aggregation. Preserve these guards.

Graph helpers and operation methods have their own forwarding rules. Verify
the actual combinations being changed rather than assuming every chain order
is interchangeable.

## Execution and response boundaries

`execute()` builds the route and query string and calls `client.httpClient`.
Record IDs are encoded as a URL path segment for reads, updates and deletes;
characters such as `?`, `#`, `%` and `/` do not become URL controls.
Database and Storage validate that a table or bucket was selected. Repeating
execution sends another request; it does not cache or consume the builder.

`Database.first()` uses a one-row list read when no page is specified, then
returns the first row or `null`. `count()` uses a one-row list read and prefers
`total`, with an array-length fallback. Both perform HTTP requests.

`Storage.getUrl()` only builds a URL. `Storage.upload()` constructs `FormData`
while configuring the operation, so that runtime API is needed before
`execute()`. `Storage.filter()` replaces the filter object; it does not merge
successive filter objects.

Generic arguments describe expected responses; they do not validate JSON at
runtime. Keep envelope handling aligned with the service's actual return
shape. For example, SharePoint access links are
`TaruviResponse<StorageAccessLinkResponse>`.

## Reviewing a builder change

Check the selected route, method, body, query, response shape, and sibling-query
independence in the same review. Start with the
[Database tests](../tests/unit/database/DatabaseClient.test.ts),
[Storage tests](../tests/unit/storage/StorageClient.test.ts), and
[contribution workflow](09-contributing.md). Usage examples belong in the
[public method reference](https://docs.taruvi.cloud/docs/build/javascript-reference).

Upsert and bulk update preserve the backend `data.records/count` envelope, with
result inference separate from the row type. Operation-preserving graph clones
keep the mutation type and upsert route. Query setters that reset the operation
to a read retain that behavior; apply query setters before choosing the write
operation and then use `execute()`. `first()` and `count()` retain their
row-returning builder binding and are unavailable after upsert or bulk update. See [`../TESTING.md`](../TESTING.md#mutation-result-inference)
for a typed example and the required consumer probes.
