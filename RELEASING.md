# Releasing

This document is for maintainers.

## Local checks

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm build
npm pack --dry-run
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

```bash
pnpm version patch  # or minor / major
# commits and creates a tag automatically
```

Push the tag:

```bash
git push --follow-tags
```

## npm publishing

Publish manually from a clean checkout:

```bash
pnpm build
npm publish --access public
```

Make sure you are logged in to npm and have publish rights for the package.
