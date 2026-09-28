# Releases and branches

The active release configuration is
[`.github/workflows/publish.yml`](../.github/workflows/publish.yml).
The similarly named `.github/worflows/` directory is not a GitHub Actions
workflow directory.

## Branch behavior

| Push target | New version, with no existing `v{version}` Git tag | Existing Git tag |
| --- | --- | --- |
| `main` | Tag and publish with npm `latest` | Attempt to promote that version to `latest` |
| `beta` | Tag and publish with npm `beta` | Skip publishing |
| Other branches | No publish workflow trigger | No publish workflow trigger |

An npm dist-tag and a prerelease version suffix are separate: `--tag beta` does
not add a `-beta` suffix to the version. Choose the intended version explicitly
and update `package.json` and the root version in `package-lock.json` together.
`src/version.ts` reads the package version; it has no separate version literal.

## Before releasing

Use the lockfile for local verification:

```bash
npm ci
npm test
npm run build
npm pack --dry-run --json
```

Check that the archive contains built code/declarations, `README.md`, and
package metadata. `docs/` is excluded by the `files` allowlist, so shortening
this folder does not reduce the npm package. Build before checking the archive:
`prepublishOnly` runs `npm run build` during publish, not during `npm pack`.

The workflow currently uses Node 20 and `npm install`. It does **not** run
`npm test`; maintainers must verify tests before a release reaches `main` or
`beta`. A docs-only push to `main` can still trigger dist-tag promotion.

## Documentation release check

Keep package and public documentation changes in review branches until their
versions and destinations agree:

1. Confirm the intended SDK version and any dependent provider release.
2. Verify that the public [SDK guide](https://docs.taruvi.cloud/docs/build/javascript),
   [authentication guide](https://docs.taruvi.cloud/docs/build/javascript-authentication),
   and [method reference](https://docs.taruvi.cloud/docs/build/javascript-reference)
   are accessible to readers and describe that SDK version.
3. Check README links and the short pointers at the old guide paths. Preserve
   those files for existing GitHub bookmarks; add new usage material only to
   the public docs.
4. Complete this check before merging a README handoff into a publishing branch.
   If the matching public docs are not live, hold that handoff on its review
   branch. A local preview or HTTP error does not establish availability.

The public docs source lives in `taruvi-platform/docs/docs/build/`; product
workflows live in `taruvi-platform/docs/docs/products/`. Coordinate those
changes with the SDK release rather than copying a second manual here.

## Verify publication

The workflow creates the Git tag **before** publishing. A tag alone is not
proof of an npm release. After the workflow completes, inspect the registry:

```bash
npm view @taruvi/sdk dist-tags --json
npm view @taruvi/sdk@VERSION version dist.integrity --json
```

Replace `VERSION` with the release version. Confirm that the intended dist-tag
points to it, then install that exact package in a consumer and check imports
and the relevant SDK/provider flow.

If publication fails after tagging, compare the workflow result, Git tag, and
registry before retrying. The existing-tag branch may skip publishing or try
to promote a version that is absent from npm. Do not treat that as success.
Published versions cannot be overwritten; subsequent package or npm README
changes require a new package version.
