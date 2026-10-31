# Contributing to next-graph

Thanks for taking the time to contribute!

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18.17
- [pnpm](https://pnpm.io/) 9 (see `packageManager` in `package.json`)

## Setup

```bash
git clone https://github.com/slxca/next-graph.git
cd next-graph
pnpm install
```

## Scripts

```bash
pnpm dev          # watch build
pnpm build        # clean + bundle
pnpm typecheck    # TypeScript strict check
pnpm lint         # Biome check
pnpm lint:fix     # Biome check + auto-fix
pnpm format       # Biome format
```

## Project layout

```text
src/
  core/           scanner, parser, types, presentation
  cli/            terminal entry + tree renderer
  server/         Next.js route handler + web UI template
```

## Code style

- Biome enforces formatting and linting.
- Strict TypeScript is enabled; avoid `any`.
- Do not add new runtime dependencies. The only allowed runtime dependency is `picocolors` for CLI colors.
- Use `node:` imports where possible.

## Adding a new App Router convention

1. Update `src/core/scanner.ts` to recognize the folder/file pattern.
2. Add the URL mapping rule and update `src/core/types.ts` if the JSON shape changes.
3. Update the CLI renderer (`src/cli/tree.ts`) and web UI (`src/server/template.ts`) if needed.
4. Update this README's detection table.

## Pull request process

1. Open an issue for large changes before writing code.
2. Create a branch from `main`.
3. Make focused commits with clear messages.
4. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.

## Releasing

Maintainers: see [RELEASING.md](./RELEASING.md).

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold it.
