# Releases and branches

The active release configuration is
[`.github/workflows/publish.yml`](../.github/workflows/publish.yml).
The similarly named `.github/worflows/` directory is not a GitHub Actions
workflow directory.

## Branch behavior

| Push target | Version in `package.json` | Result |
| --- | --- | --- |
| `beta` | Pre-release, such as `1.5.4-beta.1` | Published with npm `beta`, then tagged `v1.5.4-beta.1` |
| `main` | Stable, such as `1.5.4` | Published with npm `latest`, then tagged `v1.5.4` |
| Either | Already on npm | Nothing published |
| `beta` with a stable version, or `main` with a pre-release | — | Workflow fails before publishing |
| Other branches | — | No publish workflow trigger |

The workflow never moves dist-tags: trusted publishing covers `npm publish`,
not `npm dist-tag`. A version therefore reaches `latest` only by being
published from `main`. Test `1.5.4-beta.1` from `beta`, then set `1.5.4` on the
branch that merges into `main`.

Set the version with `npm version <version> --no-git-tag-version`, which updates
`package.json` and the root version in `package-lock.json` together.
`src/version.ts` reads the package version; it has no separate version literal.

## Trusted publishing

The workflow publishes with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers):
GitHub issues a short-lived identity token for each run, and no npm token is
stored in GitHub or Infisical. It needs:

- a trusted publisher on the package's npmjs.com settings page: GitHub Actions,
  organization `Taruvi-ai`, repository `taruvi-js-sdk`, workflow `publish.yml`,
  and no environment;
- `repository.url` in `package.json` matching this repository;
- `id-token: write` in the workflow, Node 22.14 or later, and npm 11.5.1 or later.

npm doesn't check the trusted publisher when it is saved; a mismatch surfaces as
a failed `npm publish`. Renaming `publish.yml` requires updating it on npm.

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

The workflow runs `npm ci`, `npm test`, and `npm run build` on Node 24 before
publishing, and a failure stops the release. A push whose version is already on
npm, such as a docs-only change, publishes nothing.

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

The workflow creates the Git tag only after npm accepts the version. After it
completes, inspect the registry:

```bash
npm view @taruvi/sdk dist-tags --json
npm view @taruvi/sdk@VERSION version dist.integrity --json
```

Replace `VERSION` with the release version. Confirm that the intended dist-tag
points to it, then install that exact package in a consumer and check imports
and the relevant SDK/provider flow.

If publication fails, fix the cause and re-run the workflow: it checks npm, not
Git tags, so a failed run doesn't block the retry. Published versions cannot be
overwritten; subsequent package or npm README changes require a new package
version.
