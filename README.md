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

## Storage uploads

`Storage.upload(...).execute()` keeps the same call for small and large files.
In a browser, a file larger than 100 MiB in an S3-backed bucket uploads
directly to S3 in parts. Smaller files and SharePoint buckets use the existing
batch API. The S3 bucket must allow `PUT` from the app's browser origin.

```typescript
import {Storage, type StorageUploadBatchResponse} from '@taruvi/sdk'

const file = document.querySelector<HTMLInputElement>('input[type=file]')?.files?.[0]
if (!file) throw new Error('Choose a file first')
const controller = new AbortController()
const result = await new Storage(client).from('documents').upload(
  {files: [file], paths: ['reports/file.pdf'], metadatas: [{}]},
  {
    signal: controller.signal,
    onProgress: ({loaded, total, phase}) => console.log(loaded, total, phase),
  },
).execute<StorageUploadBatchResponse>()

// Call controller.abort() to stop an upload before finalization begins.
// Check result.data.failed for per-file failures.
```

After the parts reach S3, progress enters `finalizing` while Taruvi creates
the storage object. This last step runs to completion even if the caller aborts,
because S3 may already have completed the file.

## Signed download links

For an S3-backed bucket, request a temporary link when someone needs to open
or share a file without signing in. The signed link is a bearer credential;
anyone holding it can use it until it expires.

```typescript
import {Storage, type StorageSignedUrlsResponse} from '@taruvi/sdk'

const response = await new Storage(client).from('documents').createSignedUrls({
  paths: ['reports/file.pdf'], expiresIn: 300,
}).execute<StorageSignedUrlsResponse>()
const link = response.data[0]?.signed_url
// Use link as the href of a Download button.
// Check each row's error for missing or forbidden files.
```

You can supply `objectUuids` instead of `paths`. Taruvi accepts up to 100 items
per request; the default maximum expiry is 3,600 seconds.

## Documentation

- [JavaScript SDK guide](https://docs.taruvi.cloud/docs/build/javascript): installation, client setup, requests, responses, and errors.
- [Authentication](https://docs.taruvi.cloud/docs/build/javascript-authentication): hosted sign-in, sessions, and server-rendered apps.
- [Method reference](https://docs.taruvi.cloud/docs/build/javascript-reference): services, parameters, return values, and examples.
- [Product guides](https://docs.taruvi.cloud/docs/products): task-based guides for each TaruviBase service.

Use the SDK version covered by each guide when following its examples.

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
