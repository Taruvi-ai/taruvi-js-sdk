# JavaScript API reference

Use the public [JavaScript method reference](https://docs.taruvi.cloud/docs/build/javascript-reference)
for SDK methods, types, options, results, and errors.

The exports for this checkout are in [`src/index.ts`](../src/index.ts).

Source declarations follow the current platform serializers. App Settings
includes `icon_background_color` and `default_frontend_worker_slug` and has no
banner fields. Secret batch values may be JSON objects; metadata includes
`sensitivity_level`. Storage downloads return a Blob in both browser and Node
runtimes, preserving binary bytes and MIME type. These source fixes are not a
claim that a previously published package already contains them. See
[`../TESTING.md`](../TESTING.md) for the required type and real-HTTP gates.

Database upsert and bulk-update results contain `data.records` and `data.count`;
ordinary reads retain the row type. Select query filters before choosing the
mutation, and call `execute()` to obtain its envelope. `first()` and `count()`
retain row-returning builder types and are unavailable after `upsert()` or
`bulkUpdate()`. The source's result-mode generic
tracks this contract through operation-preserving fluent clones; applications
should infer it from the builder methods.
