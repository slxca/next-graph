import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { parseRouteModule } from './parser';
import type {
  ActiveBoundaries,
  RouteFile,
  RouteFileKind,
  RouteMap,
  RouteMapStats,
  RouteNode,
  ScanOptions,
} from './types';

export * from './parser';
export * from './types';

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'] as const;
type Extension = (typeof EXTENSIONS)[number];

const KIND_BY_BASENAME: Record<string, RouteFileKind> = {
  page: 'page',
  layout: 'layout',
  loading: 'loading',
  error: 'error',
  route: 'route',
};

const STAT_KEY: Record<RouteFileKind, keyof RouteMapStats> = {
  page: 'pages',
  route: 'routes',
  layout: 'layouts',
  loading: 'loading',
  error: 'errors',
};

interface ScanContext {
  cwd: string;
  stats: RouteMapStats;
  warnings: string[];
}

interface DirectoryInput {
  dir: string;
  segment: string;
  url: string;
  isDynamic: boolean;
  isGroup: boolean;
  isSlot: boolean;
  boundaries: ActiveBoundaries;
}

export async function findAppDirectory(cwd = process.cwd()): Promise<string | null> {
  for (const candidate of [join(cwd, 'app'), join(cwd, 'src', 'app')]) {
    const info = await stat(candidate).catch(() => null);
    if (info?.isDirectory()) return candidate;
  }
  return null;
}

export async function scanApp(options: ScanOptions = {}): Promise<RouteMap> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const appDir = options.appDir ? resolve(cwd, options.appDir) : await findAppDirectory(cwd);

  if (!appDir) {
    throw new Error(`No App Router directory found in ${cwd}. Expected "app/" or "src/app/".`);
  }

  const info = await stat(appDir).catch(() => null);
  if (!info?.isDirectory()) {
    throw new Error(`Unable to read app directory: ${appDir}`);
  }

  const context: ScanContext = {
    cwd,
    stats: { pages: 0, routes: 0, layouts: 0, loading: 0, errors: 0, client: 0, edge: 0 },
    warnings: [],
  };

  const root =
    (await scanDirectory(
      {
        dir: appDir,
        segment: '',
        url: '/',
        isDynamic: false,
        isGroup: false,
        isSlot: false,
        boundaries: { layouts: [] },
      },
      context,
      true,
    )) ?? createEmptyRoot();

  return {
    appDir,
    cwd,
    generatedAt: new Date().toISOString(),
    stats: context.stats,
    warnings: context.warnings,
    root,
  };
}

async function scanDirectory(
  input: DirectoryInput,
  context: ScanContext,
  force = false,
): Promise<RouteNode | null> {
  let entries: Dirent[];
  try {
    entries = await readdir(input.dir, { withFileTypes: true });
  } catch {
    context.warnings.push(`Skipped ${toRelative(input.dir, context.cwd)} (unreadable).`);
    return null;
  }

  const filesByKind = collectRouteFiles(entries, input.dir, context);

  const [page, route, layout, loading, error] = await Promise.all([
    readFileForKind(filesByKind.get('page'), 'page', context),
    readFileForKind(filesByKind.get('route'), 'route', context),
    readFileForKind(filesByKind.get('layout'), 'layout', context),
    readFileForKind(filesByKind.get('loading'), 'loading', context),
    readFileForKind(filesByKind.get('error'), 'error', context),
  ]);

  if (page && route) {
    context.warnings.push(
      `Both page and route handler exist in ${toRelative(input.dir, context.cwd)}.`,
    );
  }

  const layouts = layout ? [...input.boundaries.layouts, layout] : input.boundaries.layouts;
  const activeLoading = loading ?? input.boundaries.loading;
  const activeError = error ?? input.boundaries.error;

  const boundaries: ActiveBoundaries = { layouts };
  if (activeLoading) boundaries.loading = activeLoading;
  if (activeError) boundaries.error = activeError;

  const node: RouteNode = {
    segment: input.segment,
    url: input.url,
    isDynamic: input.isDynamic,
    isGroup: input.isGroup,
    isSlot: input.isSlot,
    boundaries,
    children: [],
  };

  if (page) node.page = page;
  if (route) node.route = route;
  if (layout) node.layout = layout;
  if (loading) node.loading = loading;
  if (error) node.error = error;

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !isIgnoredDirectory(name))
    .sort();

  for (const name of directories) {
    const isGroup = isRouteGroup(name);
    const isSlot = name.startsWith('@');
    const stripped = stripInterception(name);

    let childUrl = input.url;
    let childDynamic = input.isDynamic;
    if (!isGroup && !isSlot && stripped.length > 0) {
      childUrl = joinUrl(input.url, stripped);
      if (isDynamicSegment(stripped)) childDynamic = true;
    }

    const child = await scanDirectory(
      {
        dir: join(input.dir, name),
        segment: name,
        url: childUrl,
        isDynamic: childDynamic,
        isGroup,
        isSlot,
        boundaries,
      },
      context,
    );

    if (child) node.children.push(child);
  }

  node.children.sort(compareNodes);

  const hasOwnFiles = Boolean(page ?? route ?? layout ?? loading ?? error);
  if (!force && !hasOwnFiles && node.children.length === 0) return null;

  return node;
}

function collectRouteFiles(
  entries: Dirent[],
  dir: string,
  context: ScanContext,
): Map<RouteFileKind, string> {
  const candidates = new Map<RouteFileKind, string[]>();

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const extension = EXTENSIONS.find((ext) => entry.name.endsWith(ext));
    if (!extension) continue;
    const name = entry.name.slice(0, -extension.length);
    const kind = KIND_BY_BASENAME[name];
    if (!kind) continue;
    const list = candidates.get(kind) ?? [];
    list.push(join(dir, entry.name));
    candidates.set(kind, list);
  }

  const selected = new Map<RouteFileKind, string>();
  for (const [kind, paths] of candidates) {
    paths.sort((a, b) => extensionPriority(a) - extensionPriority(b));
    const [first, ...rest] = paths;
    if (!first) continue;
    selected.set(kind, first);
    if (rest.length > 0) {
      context.warnings.push(
        `Conflicting ${kind} files in ${toRelative(dir, context.cwd)}; using ${basename(first)}.`,
      );
    }
  }

  return selected;
}

function extensionPriority(filePath: string): number {
  const ext = EXTENSIONS.find((extension) => filePath.endsWith(extension));
  return ext ? EXTENSIONS.indexOf(ext as Extension) : EXTENSIONS.length;
}

async function readFileForKind(
  filePath: string | undefined,
  kind: RouteFileKind,
  context: ScanContext,
): Promise<RouteFile | undefined> {
  if (!filePath) return undefined;
  try {
    const parsed = await parseRouteModule(filePath);
    const file: RouteFile = {
      kind,
      file: filePath,
      relativePath: toRelative(filePath, context.cwd),
      client: parsed.client,
      ...(parsed.runtime ? { runtime: parsed.runtime } : {}),
      ...(parsed.dynamic ? { dynamic: parsed.dynamic } : {}),
      ...(parsed.revalidate !== undefined ? { revalidate: parsed.revalidate } : {}),
    };

    context.stats[STAT_KEY[kind]] += 1;
    if (file.client) context.stats.client += 1;
    if (file.runtime === 'edge') context.stats.edge += 1;

    return file;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.warnings.push(`Could not parse ${toRelative(filePath, context.cwd)}: ${message}`);
    return undefined;
  }
}

function isIgnoredDirectory(name: string): boolean {
  return name.startsWith('.') || name.startsWith('_') || name === 'node_modules';
}

function isRouteGroup(segment: string): boolean {
  return /^\((?!\.)[^)]*\)$/.test(segment);
}

function stripInterception(segment: string): string {
  let result = segment;
  while (/^\(\.{1,3}\)/.test(result)) {
    result = result.replace(/^\(\.{1,3}\)/, '');
  }
  return result;
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith('[') && segment.endsWith(']');
}

function joinUrl(base: string, segment: string): string {
  return base === '/' ? `/${segment}` : `${base}/${segment}`;
}

function compareNodes(a: RouteNode, b: RouteNode): number {
  if (a.isDynamic !== b.isDynamic) return a.isDynamic ? 1 : -1;
  return a.segment.localeCompare(b.segment);
}

function createEmptyRoot(): RouteNode {
  return {
    segment: '',
    url: '/',
    isDynamic: false,
    isGroup: false,
    isSlot: false,
    boundaries: { layouts: [] },
    children: [],
  };
}

function toRelative(target: string, cwd: string): string {
  return relative(cwd, target).replaceAll('\\', '/') || '.';
}
