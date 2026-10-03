# Taruvi SDK

`@taruvi/sdk` is the TypeScript and JavaScript client for TaruviBase. It provides
shared authentication, query builders, and typed errors for database, storage,
auth, users, functions, analytics, secrets, policy, and settings.

## Install

```bash
npm install @taruvi/sdk axios@^1
```

The package ships ESM and TypeScript declarations. Axios 1.x is its peer
dependency. See [package compatibility](https://docs.taruvi.cloud/docs/build/javascript#package-compatibility)
for runtime requirements.

## Quick start

For a browser app using the signed-in user's session:

```typescript
import {Client, Database} from '@taruvi/sdk'

const client = new Client({
  apiUrl: 'https://YOUR_SITE.taruvi.cloud',
  appSlug: 'YOUR_APP_SLUG',
})

await new Database(client)
  .from('tasks')
  .filters('done', 'eq', false)
  .sort('title', 'asc')
  .pageSize(20)
  .execute()
```

Set up [hosted sign-in](https://docs.taruvi.cloud/docs/build/javascript-authentication)
before making authenticated browser requests. Server code can use
`authMode: 'apiKey'` with an `apiKey`, or act as a user with a session `token`.
Keep API keys on the server; see [server authentication](https://docs.taruvi.cloud/docs/build/javascript-authentication#call-taruvibase-from-a-server).

## Documentation

- [JavaScript SDK guide](https://docs.taruvi.cloud/docs/build/javascript): installation, client setup, requests, responses, and errors.
- [Authentication](https://docs.taruvi.cloud/docs/build/javascript-authentication): hosted sign-in, sessions, and server-rendered apps.
- [Method reference](https://docs.taruvi.cloud/docs/build/javascript-reference): services, parameters, return values, and examples.
- [Product guides](https://docs.taruvi.cloud/docs/products): task-based guides for each TaruviBase service.

Use the SDK version covered by each guide when following its examples.

Function execute responses from the matching platform include an optional
`queued` flag: asynchronous acknowledgements are true, synchronous results are
false. Queued calls carry `data=[]`; a synchronous None result also becomes `[]`. An empty
`data` array alone does not identify the mode. Older servers
omit the flag; choose `async` explicitly when those servers are in use.

Execution returns the full `FunctionResponse<T>` envelope. Invocation records
use numeric `id`/`function`, nullable caller fields, and a nullable `task_result`.
Read Celery state from `invocation.task_result?.status`; invocation records have
no top-level `status` or `task_status`. Detail payloads include `logs`, while
invocation lists omit them. `FunctionTaskResult` is exported for the nested
retained metadata. The JavaScript `Functions` service currently exposes execute;
the invocation declaration also describes records received through HTTP clients.

`data` includes an empty-array acknowledgement, so typed consumers must narrow
it before accessing object properties. The generic is a declaration of the
expected output, without runtime schema validation.

## Contributing

[Maintainer documentation](https://github.com/Taruvi-ai/taruvi-js-sdk/blob/main/docs/README.md)
covers architecture, builder design, development, and releases. For a checkout
with dependencies installed:

```bash
npm test
npm run build
```

## License and author

MIT. Curran C Doddabele · EOX Vantage.
