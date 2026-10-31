# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-11-01

### Changed

- Redesigned CLI tree renderer: URL-first nodes, compact engine/bounds metadata blocks, unified cross-mode icon system, and removal of header/footer banners.
- Redesigned web UI: zinc-950 dark theme, nested card graph with left-border depth accents, sticky header with search + engine filter chips, page pills, and boundary chips.
- Extracted shared presentation helpers into `src/core/presentation.ts` so CLI and web UI agree on engine and bounds labels.

## [1.0.0] - 2026-10-31

### Added

- CLI tree renderer with box-drawing characters and color support.
- Next.js App Router scanner supporting route groups, dynamic / catch-all / optional-catch-all segments, parallel slots, intercepting routes, and `src/app`.
- TypeScript AST parser detecting `"use client"`, `runtime`, `dynamic`, and `revalidate`.
- Cascading layout / loading / error boundary resolution.
- Drop-in route handler `createRouteMap()` with local web UI.
- Searchable, expandable web UI using Tailwind CSS via CDN.
- JSON export via `--json`.
- Full GitHub community package: issue templates, PR template, CoC, Security, Sponsors.
