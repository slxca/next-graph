import type { RouteFile, RouteFileKind } from './types';

/** Rendering strategy bucket for a route. */
export type RenderMode = 'static' | 'dynamic' | 'isr';

/** Presentation metadata for the rendering engine line. */
export interface EngineInfo {
  /** Primary rendering-mode icon (🧊 / 🟢 / ⏱️). */
  icon: string;
  /** Full display label including icons, e.g. "⚡️ Edge · 🧊 Static". */
  label: string;
  /** Machine key used by the web UI for filtering. */
  key: RenderMode | 'edge';
  /** Whether the route is rendered on the edge runtime. */
  edge: boolean;
}

/** Presentation metadata for the bounds / component line. */
export interface BoundsInfo {
  icon: string;
  label: string;
  /** Machine key used by the web UI. */
  key: 'client' | 'server' | 'route-handler';
}

/** Presentation metadata for a boundary file chip. */
export interface BoundaryChipInfo {
  kind: RouteFileKind;
  icon: string;
  label: string;
  name: string;
}

const ENGINE: Record<RenderMode, { icon: string; label: string }> = {
  static: { icon: '🧊', label: 'Static' },
  dynamic: { icon: '🟢', label: 'Dynamic (Node.js)' },
  isr: { icon: '⏱️', label: 'ISR' },
};

const BOUNDS: Record<'client' | 'server' | 'route-handler', { icon: string; label: string }> = {
  client: { icon: '🟦', label: 'Client Component' },
  server: { icon: '', label: 'Server Component' },
  'route-handler': { icon: '', label: 'Route Handler' },
};

/**
 * Determine the rendering strategy for a route file.
 *
 * The heuristic mirrors Next.js App Router defaults:
 * - `dynamic: 'force-dynamic'` → dynamic
 * - `dynamic: 'force-static'` or `'error'` → static
 * - `revalidate: false` → static
 * - `revalidate: 0` → dynamic
 * - `revalidate` > 0 → ISR
 * - dynamic URL segment without explicit config → dynamic
 * - everything else → static
 */
export function inferRenderMode(file: RouteFile, isDynamicRoute: boolean): RenderMode {
  if (file.dynamic === 'force-dynamic') return 'dynamic';
  if (file.dynamic === 'force-static' || file.dynamic === 'error') return 'static';
  if (file.revalidate === false) return 'static';
  if (file.revalidate === 0) return 'dynamic';
  if (typeof file.revalidate === 'number' && file.revalidate > 0) return 'isr';
  return isDynamicRoute ? 'dynamic' : 'static';
}

/**
 * Build the compact engine metadata block used by CLI and web UI.
 */
export function getEngineInfo(file: RouteFile, isDynamicRoute: boolean): EngineInfo {
  const mode = inferRenderMode(file, isDynamicRoute);
  const base = ENGINE[mode];
  const edge = file.runtime === 'edge';

  if (mode === 'isr') {
    const revalidate = typeof file.revalidate === 'number' ? file.revalidate : 0;
    const modeLabel = `${base.icon} ${base.label} (revalidate: ${revalidate}s)`;
    return {
      icon: base.icon,
      label: edge ? `⚡️ Edge · ${modeLabel}` : modeLabel,
      key: 'isr',
      edge,
    };
  }

  const modeLabel = `${base.icon} ${base.label}`;
  return {
    icon: base.icon,
    label: edge ? `⚡️ Edge · ${modeLabel}` : modeLabel,
    key: mode,
    edge,
  };
}

/**
 * Build the compact bounds metadata block used by CLI and web UI.
 */
export function getBoundsInfo(file: RouteFile): BoundsInfo {
  if (file.kind === 'route') {
    return {
      icon: BOUNDS['route-handler'].icon,
      label: BOUNDS['route-handler'].label,
      key: 'route-handler',
    };
  }
  if (file.client) {
    return { icon: BOUNDS.client.icon, label: BOUNDS.client.label, key: 'client' };
  }
  return { icon: BOUNDS.server.icon, label: BOUNDS.server.label, key: 'server' };
}

/**
 * Build the label for a layout/loading/error boundary chip.
 */
export function getBoundaryChipInfo(file: RouteFile, segment: string): BoundaryChipInfo {
  const icon: Record<RouteFileKind, string> = {
    layout: '🥪',
    loading: '⏳',
    error: '🚨',
    page: '📄',
    route: '🔗',
  };
  return {
    kind: file.kind,
    icon: icon[file.kind],
    label: file.kind.charAt(0).toUpperCase() + file.kind.slice(1),
    name: boundaryName(segment, file.kind),
  };
}

function boundaryName(segment: string, kind: RouteFileKind): string {
  const suffix = kind.charAt(0).toUpperCase() + kind.slice(1);
  if (!segment || segment === '/') return `Root${suffix}`;

  const base = segment.replace(/^\(+/, '').replace(/\)+$/, '');
  if (!base) return `Group${suffix}`;

  const cleaned = base
    .replace(/\[\.\.\./g, '')
    .replace(/\[\[\.\.\./g, '')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  if (!cleaned) return `Segment${suffix}`;

  return (
    cleaned
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('') + suffix
  );
}
