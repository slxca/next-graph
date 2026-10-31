/** Runtime a route module can be pinned to. */
export type RouteRuntime = 'edge' | 'nodejs';

/** Values supported by the Next.js `dynamic` route segment config. */
export type RouteDynamic = 'auto' | 'force-dynamic' | 'error' | 'force-static';

/** Special files recognised by the App Router scanner. */
export type RouteFileKind = 'page' | 'layout' | 'loading' | 'error' | 'route';

export interface RouteFile {
  kind: RouteFileKind;
  /** Absolute path on disk. */
  file: string;
  /** Path relative to the scanned project root, using POSIX separators. */
  relativePath: string;
  /** Whether the module starts with a `"use client"` directive. */
  client: boolean;
  runtime?: RouteRuntime;
  dynamic?: RouteDynamic;
  revalidate?: number | false;
}

export interface ActiveBoundaries {
  /** Active layouts wrapping this segment, outermost first. */
  layouts: RouteFile[];
  /** Nearest active loading boundary. */
  loading?: RouteFile;
  /** Nearest active error boundary. */
  error?: RouteFile;
}

export interface RouteNode {
  /** Raw directory name. Empty for the app root. */
  segment: string;
  /** Resolved URL path with route groups and parallel slots removed. */
  url: string;
  /** Whether the resolved URL contains a dynamic segment. */
  isDynamic: boolean;
  /** Whether this node is a route group, e.g. `(marketing)`. */
  isGroup: boolean;
  /** Whether this node is a parallel route slot, e.g. `@modal`. */
  isSlot: boolean;
  page?: RouteFile;
  route?: RouteFile;
  layout?: RouteFile;
  loading?: RouteFile;
  error?: RouteFile;
  /** Boundaries that apply to this segment and everything below it. */
  boundaries: ActiveBoundaries;
  children: RouteNode[];
}

export interface RouteMapStats {
  pages: number;
  routes: number;
  layouts: number;
  loading: number;
  errors: number;
  /** Total route files marked as client components. */
  client: number;
  /** Total route files pinned to the edge runtime. */
  edge: number;
}

export interface RouteMap {
  /** Absolute path to the detected app directory. */
  appDir: string;
  /** Absolute path to the project root used for relative paths. */
  cwd: string;
  generatedAt: string;
  stats: RouteMapStats;
  warnings: string[];
  root: RouteNode;
}

export interface ScanOptions {
  /** Project root. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Explicit app directory, relative to `cwd` or absolute. */
  appDir?: string;
}
