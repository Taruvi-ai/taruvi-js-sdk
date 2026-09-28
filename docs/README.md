# SDK maintainer documentation

This folder explains how to change and release `@taruvi/sdk`. Application usage
belongs in the [public documentation](../README.md#documentation); keep API
examples and troubleshooting there rather than maintaining a second manual.

| Page | Maintainer task |
| --- | --- |
| [Builder design](02-builder-pattern.md) | Preserve request state, branching, and execution semantics |
| [Architecture](03-architecture.md) | Locate configuration, transport, routes, types, and error handling |
| [Contributing](09-contributing.md) | Set up the checkout, change a client, and verify the contract |
| [Releases and branches](08-releases-and-branches.md) | Check package contents and publish the matching version |

These notes describe the source in the same checkout. `package.json` identifies
its SDK version; a branch version alone does not establish an npm release.

The former introduction, client overview, API reference, examples, and advanced
guides remain as short pointers so existing file links still resolve. Keep the
[public documentation release check](08-releases-and-branches.md#documentation-release-check)
with the package release.
