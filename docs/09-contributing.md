# Contributing

## Set up the checkout

```bash
git clone --branch main https://github.com/Taruvi-ai/taruvi-js-sdk.git
cd taruvi-js-sdk
npm ci
npm test
npm run build
```

Use a Node.js runtime with JSON import-attribute support for the emitted SDK.
The publish workflow currently selects Node 20; see the
[public compatibility requirements](https://docs.taruvi.cloud/docs/build/javascript#package-compatibility)
and [release verification](08-releases-and-branches.md) when choosing a toolchain.
TypeScript, Node declarations, and Vitest are development dependencies; Axios
is the package's peer dependency.

## Make a focused change

1. Find the owning service in `src/lib/` and its routes in
   `src/lib-internal/routes/`; use the [architecture map](03-architecture.md).
2. Verify the backend path, method, input, response envelope, and relevant
   error or partial-failure behavior. A TypeScript return annotation is not
   evidence of the wire contract.
3. Add or update public types beside the service and export intended public
   APIs from `src/index.ts`. Use `.js` extensions for relative source imports,
   as required by the package's NodeNext ESM layout.
4. Preserve [builder state and branching](02-builder-pattern.md). Test the
   chain combinations affected by the change, including sibling queries.
5. Update the matching public SDK/product documentation and its supported
   version. Update these maintainer notes only when design or workflow changes.

Do not commit generated `dist/` files. Keep dependency changes and their
lockfile changes together. Use a review branch; pushes to `main` and `beta`
have [publishing effects](08-releases-and-branches.md#branch-behavior).

## Verification

`npm test` runs Vitest under `tests/unit/`; `npm run test:watch` runs watch mode.
Most service tests use [the shared mock client](../tests/fixtures/mockClient.ts)
to assert exact routes, HTTP methods, bodies, and response handling.

For transport or authentication changes, exercise the real interceptors and
runtime behavior as in [auth-modes.test.ts](../tests/unit/client/auth-modes.test.ts).
For error changes, cover the response-to-error mapping in
[errors.test.ts](../tests/unit/errors/errors.test.ts). Mocked requests do not
establish deployed-backend compatibility; record any integration checks separately.

Run `npm run build` for the strict TypeScript source/declaration build. Tests
are excluded from `tsconfig.json`; Vitest execution alone is not a test-file
typecheck. For documentation-only changes, verify links, examples, and the
package file list when the README or packaging guidance changes.
