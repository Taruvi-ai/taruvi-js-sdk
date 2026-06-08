# Releases and branches

How `@taruvi/sdk` is versioned, which branch to use, and how packages get published to npm.

## Branches

| Branch | Purpose | npm dist-tag |
|--------|---------|----------------|
| **`main`** | Stable releases for production apps | `latest` (default when you `npm install @taruvi/sdk`) |
| **`beta`** | Experimental releases — new APIs or behavior still being validated | `beta` (install with `npm install @taruvi/sdk@beta`) |

Use **`main`** when you want the supported, stable SDK. Use **`beta`** when you need early access and can accept breaking or in-flux changes.

## Installing a release

```bash
# Stable (from main)
npm install @taruvi/sdk

# Experimental (from beta)
npm install @taruvi/sdk@beta
```

Check `package.json` in this repo for the current version (e.g. `1.5.0` on main, `1.5.0-beta.1` on beta).

## How publishing works (CI/CD)

Publishing is **automated** when you push to **`main`** or **`beta`** after changing the version in [`package.json`](../package.json).

1. **Bump the version** in `package.json` on the branch you are releasing from (`main` for stable, `beta` for experimental).
2. **Commit and push** (or upload) to that branch on the remote.
3. **GitHub Actions** runs the publish workflow (see [`.github/workflows/publish.yml`](../.github/workflows/publish.yml)):
   - Installs dependencies (`npm install`)
   - Runs the test suite (`npm test`)
   - Detects whether this version is new (compares `package.json` version to existing git tags)
   - If the version is new: creates a git tag `v{version}`, then publishes to the npm registry
4. **Which npm tag is used depends on the branch:**
   - Push to **`main`** → publish a **stable** release (`latest` on npm)
   - Push to **`beta`** → publish an **experimental** release (`beta` on npm)

If the version in `package.json` was already tagged and published, the workflow skips publishing (no duplicate release for the same version).

## Maintainer checklist

**Stable release (main):**

```bash
# On main — use semver without -beta suffix, e.g. 1.6.0
# Edit package.json "version", then:
git add package.json
git commit -m "chore: release v1.6.0"
git push origin main
```

**Experimental release (beta):**

```bash
# On beta — use a beta semver, e.g. 1.6.0-beta.2
# Edit package.json "version", then:
git add package.json
git commit -m "chore: release v1.6.0-beta.2"
git push origin beta
```

After CI succeeds, verify on [npmjs.com/package/@taruvi/sdk](https://www.npmjs.com/package/@taruvi/sdk) under **Versions** / **Tags**.

## Local verification before release

```bash
npm install
npm test
npm run build
```

## See also

- [Introduction — Installation](01-introduction.md#installation)
- [Advanced topics — Packaging](07-advanced-topics.md#packaging--consumption)
