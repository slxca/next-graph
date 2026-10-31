import { findAppDirectory, scanApp } from '../core/scanner';
import type { ActiveBoundaries, RouteFile, RouteMap, RouteNode, ScanOptions } from '../core/types';
import { renderRouteMapErrorHtml, renderRouteMapHtml } from './template';

export interface CreateRouteMapOptions {
  /** Public path where the map is mounted. Defaults to "/map". */
  basePath?: string;
  /** Disable the endpoint entirely. Defaults to false in production. */
  enabled?: boolean;
}

export type RouteMapHandler = () => Promise<Response>;

function normalizeBasePath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '/') return '/';
  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return prefixed.replace(/\/+$/, '');
}

export function createRouteMap(config: CreateRouteMapOptions = {}): RouteMapHandler {
  const basePath = normalizeBasePath(config.basePath ?? '/map');
  const enabled = config.enabled ?? process.env.NODE_ENV !== 'production';

  return async function GET(): Promise<Response> {
    if (!enabled) {
      return new Response('next-graph is disabled in this environment.', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    try {
      const routeMap = await scanApp();
      return new Response(renderRouteMapHtml(routeMap, { basePath }), {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store, max-age=0',
          'x-content-type-options': 'nosniff',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(renderRouteMapErrorHtml(message, { basePath }), {
        status: 500,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }
  };
}

export type { ActiveBoundaries, RouteFile, RouteMap, RouteNode, ScanOptions };
export { findAppDirectory, scanApp };
