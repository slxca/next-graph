# next-graph

> **Next.js routing gets messy.** `next-graph` is a zero-dependency analyzer that turns your App Router into an interactive map, revealing hidden rendering behaviors and layout cascades.

[![npm version](https://img.shields.io/npm/v/next-graph?color=black)](https://www.npmjs.com/package/next-graph)
[![license](https://img.shields.io/npm/l/next-graph?color=black)](./LICENSE)
[![node](https://img.shields.io/node/v/next-graph?color=black)](https://www.npmjs.com/package/next-graph)

One analyzer. Two ways to see your app:

- **CLI** — a fast architectural tree in your terminal.
- **Web UI** — a drop-in route handler with a searchable, expandable map.

## Features

- ⚡ **Dual-mode by design** — CLI tree + local web UI, same tiny core.
- 🧠 **AST-aware** — native TypeScript compiler API; detects `"use client"`, `runtime`, `dynamic`, `revalidate`.
- 🗺️ **App Router native** — route groups, dynamic / catch-all / optional-catch-all segments, parallel slots, intercepting routes, `src/app`.
- 🥪 **Boundary aware** — active layout / loading / error cascade per route.
- 🎨 **Rendering hints** — static / dynamic / ISR, edge / node, client markers.
- 📦 **Nearly zero runtime dependencies** — only `picocolors` for terminal colors.
- 🛠️ **Scriptable** — `--json` output and a typed programmatic API.

## Quick start

### CLI

```bash
npx next-graph
# or
pnpm dlx next-graph
```

Example output:

```text
/ (Root)
├─ 🥪 RootLayout
├─ 🚨 RootError
└─ 📄 /
   ├─ Engine: 🧊 Static
   └─ Bounds: Server Component

├── (marketing)
│   ├── /about
│   │   └─ 📄 /about
│   │      ├─ Engine: 🧊 Static
│   │      └─ Bounds: Server Component
│   └── /blog/[slug]
│       └─ 📄 /blog/[slug]
│          ├─ Engine: ⏱️ ISR (revalidate: 3600s)
│          └─ Bounds: Server Component
│
└── /dashboard
    ├─ 🥪 DashboardLayout
    ├─ ⏳ DashboardLoading
    └── /dashboard/settings
        └─ 📄 /dashboard/settings
           ├─ Engine: 🟢 Dynamic (Node.js)
           └─ Bounds: 🟦 Client Component
```

### Icon legend

The same icon language is used in both the CLI and the web UI:

| Icon | Meaning |
| --- | --- |
| ⚡️ | Edge runtime |
| 🟢 | Node.js runtime (dynamic rendering) |
| 🧊 | Static generation (SSG) |
| ⏱️ | Incremental Static Regeneration (ISR) |
| 🟦 | Client component boundary (`"use client"`) |
| 🥪 | Layout boundary (`layout.tsx`) |
| ⏳ | Loading boundary (`loading.tsx`) |
| 🚨 | Error boundary (`error.tsx`) |
| 📄 | Page (`page.tsx`) |
| 🔗 | API route (`route.ts`) |

### Web UI

Add the analyzer as a route in your Next.js app:

```bash
pnpm add next-graph
```

```ts
// app/map/route.ts
import { createRouteMap } from 'next-graph/server';

export const dynamic = 'force-dynamic';
export const GET = createRouteMap({ basePath: '/map' });
```

Then visit `http://localhost:3000/map`.

By default the handler is disabled in production. To override explicitly:

```ts
export const GET = createRouteMap({
  basePath: '/map',
  enabled: true, // or false
});
```

## CLI options

| Option | Description |
| --- | --- |
| `[path]` | Project directory to scan (default: current directory) |
| `-d, --dir <path>` | Same as positional path |
| `--json` | Print the route map as JSON |
| `--no-color` | Disable colored output |
| `-h, --help` | Show help |
| `-v, --version` | Show version |

## Programmatic API

```ts
import { scanApp } from 'next-graph/core';

const map = await scanApp();

console.log(map.stats);
console.log(map.root.children);
```

Or import from the root entry:

```ts
import { scanApp, createRouteMap } from 'next-graph';
```

## JSON shape

```json
{
  "appDir": "/Users/slxca/project/src/app",
  "cwd": "/Users/slxca/project",
  "generatedAt": "2026-10-31T12:00:00.000Z",
  "stats": { "pages": 3, "routes": 1, "layouts": 2, "loading": 0, "errors": 0, "client": 1, "edge": 1 },
  "warnings": [],
  "root": {
    "segment": "",
    "url": "/",
    "isDynamic": false,
    "isGroup": false,
    "isSlot": false,
    "boundaries": { "layouts": [] },
    "children": [
      {
        "segment": "blog",
        "url": "/blog",
        "isDynamic": false,
        "boundaries": { "layouts": [...] },
        "page": { "kind": "page", "relativePath": "src/app/blog/page.tsx", "client": false },
        "children": [...]
      }
    ]
  }
}
```

## What gets detected

| Convention | How it is shown |
| --- | --- |
| `page.tsx` | 📄 URL with engine & bounds metadata |
| `route.ts` | 🔗 Route handler endpoint |
| `layout.tsx` | 🥪 Active wrapping layout (cascaded) |
| `loading.tsx` | ⏳ Active loading boundary |
| `error.tsx` | 🚨 Active error boundary |
| `(marketing)` | Route group, no URL change |
| `[id]`, `[...slug]`, `[[...slug]]` | Dynamic URL segment, marked yellow |
| `@modal` | Parallel slot, no URL change |
| `(.)photo` / `(..)photo` | Interception markers stripped |
| `_folder` / `.folder` | Ignored |
| `src/app` | Auto-detected |

## How it works

1. Locate `app/` or `src/app/`.
2. Recursively walk the directory tree and map Next.js conventions to URL paths.
3. Parse every route file with the native TypeScript compiler API (`ts.createSourceFile`), no eval, no Babel.
4. Inherit layouts / loading / error boundaries down the tree.
5. Render a terminal tree or inject the JSON into a local HTML page.

## Built with

- TypeScript native compiler API
- [tsup](https://tsup.egoist.dev/)
- [Biome](https://biomejs.dev/)
- [picocolors](https://github.com/alexeyraspopov/picocolors)
- [Tailwind CSS](https://tailwindcss.com/) (Play CDN, local UI only)
- Next.js + TypeScript as peer dependencies

## Local development before publishing

Use the `file:` protocol to test the package locally. Next.js (Turbopack) cannot resolve symlinked packages created with `pnpm link`, so `file:` is the reliable approach:

```bash
cd /path/to/next-graph
pnpm install
pnpm build

cd /path/to/your-next-app
pnpm add next-graph@file:/path/to/next-graph
```

Then use it in your app:

```ts
// app/map/route.ts
import { createRouteMap } from 'next-graph/server';

export const dynamic = 'force-dynamic';
export const GET = createRouteMap({ basePath: '/map' });
```

> Route handler files must use `.ts` or `.js`, not `.tsx`. After installing, restart your Next.js dev server.

## Limitations

- Rendering mode is inferred from the `dynamic` config, `revalidate`, and dynamic URL segments. The tool does **not** execute your code, so runtime dynamic APIs (`cookies()`, `headers()`, `searchParams`) are not reflected.
- Recommended for local development. The handler is disabled by default in production.
- Intercepting routes are approximated as normal URL segments.
- `.mdx` pages are not parsed.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) first.

## Security

If you discover a security issue, please report it privately via [GitHub Security Advisories](https://github.com/slxca/next-graph/security/advisories/new). See [SECURITY.md](./SECURITY.md) for details.

## Sponsor

If this tool saves you time, consider [sponsoring on GitHub](https://github.com/sponsors/slxca). See [SPONSORS.md](./SPONSORS.md) for more.

## License

MIT © [slxca](https://github.com/slxca)
