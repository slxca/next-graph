import { getBoundaryChipInfo, getBoundsInfo, getEngineInfo } from '../core/presentation';
import type { RouteFile, RouteFileKind, RouteMap, RouteNode } from '../core/types';

export interface TemplateConfig {
  basePath: string;
}

interface PresentedFile extends RouteFile {
  _engine?: ReturnType<typeof getEngineInfo>;
  _bounds?: ReturnType<typeof getBoundsInfo>;
}

interface PresentedNode extends RouteNode {
  page?: PresentedFile;
  route?: PresentedFile;
  layout?: PresentedFile;
  loading?: PresentedFile;
  error?: PresentedFile;
  children: PresentedNode[];
  _boundaryChips?: Array<{
    kind: RouteFileKind;
    icon: string;
    label: string;
    name: string;
    runtime?: 'edge' | 'nodejs';
    client: boolean;
  }>;
  _hasContent: boolean;
}

interface PresentedMap extends Omit<RouteMap, 'root'> {
  root: PresentedNode;
}

export function renderRouteMapHtml(map: RouteMap, config: TemplateConfig): string {
  const presented = enrichMap(map);
  const payload = serializeForInlineScript(presented);
  const settings = serializeForInlineScript({ basePath: config.basePath });

  return `<!doctype html>
<html lang="en" class="h-full bg-zinc-950">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>next-graph</title>
    <meta name="robots" content="noindex" />
    <meta name="color-scheme" content="dark" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
              mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
            },
          },
        },
      };
    </script>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
      details > summary { list-style: none; }
      details > summary::-webkit-details-marker { display: none; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.18); }
    </style>
  </head>
  <body class="h-full bg-zinc-950 text-zinc-300 antialiased selection:bg-cyan-500/30">
    <header class="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div class="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-lg text-cyan-400">◈</div>
            <div>
              <h1 class="text-lg font-semibold leading-none tracking-tight text-white">next-graph</h1>
              <p class="mt-1 text-[11px] text-zinc-500">App Router architecture map</p>
            </div>
          </div>

          <div class="flex flex-1 items-center gap-2 sm:max-w-md sm:justify-end">
            <div class="relative flex-1">
              <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
              </svg>
              <input
                id="search"
                type="search"
                autocomplete="off"
                spellcheck="false"
                placeholder="Search routes, files, engine..."
                class="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-2 pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none ring-0 transition focus:border-cyan-500/40 focus:bg-zinc-900"
              />
            </div>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-medium text-zinc-500">Engine:</span>
          <button type="button" data-filter="all" class="filter-chip rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 data-[active=true]:border-cyan-500/40 data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-300">All</button>
          <button type="button" data-filter="static" class="filter-chip rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 data-[active=true]:border-cyan-500/40 data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-300">🧊 Static</button>
          <button type="button" data-filter="dynamic" class="filter-chip rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 data-[active=true]:border-emerald-500/40 data-[active=true]:bg-emerald-500/10 data-[active=true]:text-emerald-300">🟢 Dynamic</button>
          <button type="button" data-filter="isr" class="filter-chip rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 data-[active=true]:border-yellow-500/40 data-[active=true]:bg-yellow-500/10 data-[active=true]:text-yellow-300">⏱️ ISR</button>
          <button type="button" data-filter="edge" class="filter-chip rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 data-[active=true]:border-fuchsia-500/40 data-[active=true]:bg-fuchsia-500/10 data-[active=true]:text-fuchsia-300">⚡️ Edge</button>
          <button type="button" data-filter="client" class="filter-chip rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 data-[active=true]:border-blue-500/40 data-[active=true]:bg-blue-500/10 data-[active=true]:text-blue-300">🟦 Client</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
          <span class="flex items-center gap-1"><span class="text-[13px]">📄</span> Page</span>
          <span class="flex items-center gap-1"><span class="text-[13px]">🔗</span> API</span>
          <span class="flex items-center gap-1"><span class="text-[13px]">🥪</span> Layout</span>
          <span class="flex items-center gap-1"><span class="text-[13px]">⏳</span> Loading</span>
          <span class="flex items-center gap-1"><span class="text-[13px]">🚨</span> Error</span>
        </div>
        <div class="flex gap-2">
          <button id="expand-all" type="button" class="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-800">Expand all</button>
          <button id="collapse-all" type="button" class="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-800">Collapse all</button>
        </div>
      </div>

      <div id="stats" class="mb-4 flex flex-wrap gap-2"></div>

      <div class="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 sm:p-4">
        <div id="tree"></div>
        <div id="empty" class="hidden py-10 text-center text-sm text-zinc-500">No routes match your filter.</div>
      </div>

      <div id="warnings" class="mt-4 hidden rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200"></div>
    </main>

    <div id="backdrop" class="fixed inset-0 z-40 hidden bg-black/70 backdrop-blur-sm transition-opacity"></div>
    <aside id="drawer" class="fixed inset-y-0 right-0 z-50 w-full max-w-md translate-x-full border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-200">
      <div class="flex h-full flex-col">
        <div class="flex items-start justify-between border-b border-zinc-800 p-5">
          <div class="min-w-0">
            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Route</p>
            <h2 id="drawer-title" class="mt-1 truncate text-lg font-semibold text-white"></h2>
          </div>
          <button id="drawer-close" type="button" aria-label="Close details" class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-white">×</button>
        </div>
        <div id="drawer-body" class="flex-1 overflow-y-auto p-5"></div>
      </div>
    </aside>

    <script>
      window.__ROUTE_MAP__ = ${payload};
    </script>
    <script>
      window.__ROUTE_MAP_CONFIG__ = ${settings};
    </script>
    <script>
      (function () {
        'use strict';

        var data = window.__ROUTE_MAP__;
        var settings = window.__ROUTE_MAP_CONFIG__ || {};
        if (!data || !data.root) return;

        var treeEl = document.getElementById('tree');
        var emptyEl = document.getElementById('empty');
        var searchEl = document.getElementById('search');
        var statsEl = document.getElementById('stats');
        var warningsEl = document.getElementById('warnings');
        var drawer = document.getElementById('drawer');
        var backdrop = document.getElementById('backdrop');
        var drawerTitle = document.getElementById('drawer-title');
        var drawerBody = document.getElementById('drawer-body');
        var drawerClose = document.getElementById('drawer-close');

        var query = '';
        var activeFilter = 'all';
        var routes = {};
        var activeKey = null;

        var BADGE = {
          static: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
          dynamic: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
          isr: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300',
          edge: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300',
          client: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
          neutral: 'border-zinc-700 bg-zinc-900 text-zinc-400',
        };

        var BOUNDARY_BADGE = {
          layout: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300',
          loading: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
          error: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
        };

        function esc(value) {
          return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
          });
        }

        function badge(text, tone) {
          return '<span class="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ' + (BADGE[tone] || BADGE.neutral) + '">' + esc(text) + '</span>';
        }

        function boundaryBadge(chip) {
          var tone = BOUNDARY_BADGE[chip.kind] || BADGE.neutral;
          var meta = [];
          if (chip.runtime === 'edge') meta.push('edge');
          if (chip.client) meta.push('client');
          var title = esc(chip.name + (meta.length ? ' · ' + meta.join(', ') : ''));
          return '<span title="' + title + '" class="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ' + tone + '">' + esc(chip.icon) + ' ' + esc(chip.label) + '</span>';
        }

        function paintUrl(url) {
          if (url === '/') return '<span class="font-semibold text-cyan-300">/</span>';
          return url.split('/').map(function (segment, index) {
            if (segment === '' && index === 0) return '';
            var isDynamic = segment.charAt(0) === '[' && segment.charAt(segment.length - 1) === ']';
            var painted = isDynamic
              ? '<span class="text-yellow-300">' + esc(segment) + '</span>'
              : '<span class="font-semibold text-cyan-300">' + esc(segment) + '</span>';
            return (index > 0 ? '<span class="text-zinc-600">/</span>' : '') + painted;
          }).join('');
        }

        function routeBadges(file) {
          var parts = [];
          if (file._engine) parts.push(badge(file._engine.label, file._engine.key));
          if (file.client) parts.push(badge('🟦 Client', 'client'));
          return parts.join('');
        }

        function renderNode(node, depth) {
          var isRoot = depth === 0;
          var tag = '';
          if (node.isGroup) tag = '<span class="italic text-zinc-500">group</span>';
          else if (node.isSlot) tag = '<span class="text-fuchsia-300/80">slot</span>';

          var summaryContent = '';
          if (!isRoot) {
            summaryContent += '<svg viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150 group-open:rotate-90"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>';
          }

          if (node.isGroup) {
            summaryContent += '<span class="font-mono text-sm italic text-zinc-400">' + esc(node.segment) + '</span>';
          } else if (node.isSlot) {
            summaryContent += '<span class="font-mono text-sm text-fuchsia-300/80">' + esc(node.segment) + '</span>';
          } else {
            summaryContent += '<span class="font-mono text-sm">' + paintUrl(node.url) + '</span>';
          }

          if (tag) summaryContent += tag;

          var chips = '';
          if (node._boundaryChips && node._boundaryChips.length > 0) {
            chips = '<span class="ml-auto hidden flex-wrap items-center justify-end gap-1 sm:flex">' + node._boundaryChips.map(boundaryBadge).join('') + '</span>';
          }

          var summary = '<summary class="group/summary flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-zinc-900">' + summaryContent + chips + '</summary>';

          var body = '<div class="ml-2 mt-1 space-y-1 border-l-2 border-zinc-800 pl-3">';
          body += renderFiles(node);
          for (var i = 0; i < node.children.length; i += 1) {
            body += renderNode(node.children[i], depth + 1);
          }
          body += '</div>';

          if (isRoot) {
            return '<div class="space-y-1">' + renderFiles(node) + node.children.map(function (child) { return renderNode(child, depth + 1); }).join('') + '</div>';
          }

          return '<details open class="group route-card" data-depth="' + depth + '">' + summary + body + '</details>';
        }

        function renderFiles(node) {
          var html = '';
          var kinds = ['page', 'route'];
          for (var i = 0; i < kinds.length; i += 1) {
            var kind = kinds[i];
            var file = node[kind];
            if (!file) continue;
            var routeKey = node.url + ':' + kind;
            routes[routeKey] = { node: node, file: file };
            html += renderPagePill(node, file, routeKey);
          }

          if (node._boundaryChips) {
            for (var j = 0; j < node._boundaryChips.length; j += 1) {
              var chip = node._boundaryChips[j];
              html += renderBoundaryRow(chip);
            }
          }

          return html;
        }

        function renderPagePill(node, file, routeKey) {
          var isActive = activeKey === routeKey;
          var icon = file.kind === 'route' ? '🔗' : '📄';
          var filename = file.relativePath.split('/').pop() || file.relativePath;
          return '<button type="button" data-route="' + esc(routeKey) + '" class="route-pill flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition hover:bg-zinc-800 hover:border-zinc-700 ' + (isActive ? 'bg-zinc-800/80 ring-1 ring-cyan-500/20' : '') + '">' +
            '<span class="text-[13px] leading-none">' + icon + '</span>' +
            '<span class="font-mono text-[13px] font-medium">' + paintUrl(node.url) + '</span>' +
            '<span class="flex flex-wrap items-center gap-1">' + routeBadges(file) + '</span>' +
            '<span class="ml-auto truncate text-[10px] text-zinc-600" title="' + esc(file.relativePath) + '">' + esc(filename) + '</span>' +
            '</button>';
        }

        function renderBoundaryRow(chip) {
          return '<div class="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-1.5 text-zinc-400">' +
            '<span class="text-[13px] leading-none">' + esc(chip.icon) + '</span>' +
            '<span class="text-[12px] font-medium">' + esc(chip.name) + '</span>' +
            '<span class="text-[10px] text-zinc-600">' + esc(chip.label.toLowerCase()) + '</span>' +
            '</div>';
        }

        function searchText(node) {
          var pieces = [node.segment, node.url];
          if (node.isGroup) pieces.push('group');
          if (node.isSlot) pieces.push('slot');
          var kinds = ['page', 'route', 'layout', 'loading', 'error'];
          for (var i = 0; i < kinds.length; i += 1) {
            var file = node[kinds[i]];
            if (!file) continue;
            pieces.push(file.relativePath, file.kind);
            if (file._engine) {
              pieces.push(file._engine.key);
              pieces.push(file._engine.label);
            }
            if (file._bounds) pieces.push(file._bounds.key, file._bounds.label);
            if (file.client) pieces.push('client');
            if (file.runtime === 'edge') pieces.push('edge');
          }
          return pieces.join(' ').toLowerCase();
        }

        function matchesFilter(file) {
          if (activeFilter === 'all') return true;
          if (activeFilter === 'client') return file.client;
          if (activeFilter === 'edge') return file.runtime === 'edge';
          if (!file._engine) return false;
          if (activeFilter === 'isr') return file._engine.key === 'isr';
          if (activeFilter === 'static') return file._engine.key === 'static';
          if (activeFilter === 'dynamic') return file._engine.key === 'dynamic';
          return false;
        }

        function filterNode(node) {
          var kids = [];
          for (var i = 0; i < node.children.length; i += 1) {
            var child = filterNode(node.children[i]);
            if (child) kids.push(child);
          }

          var selfMatches = searchText(node).indexOf(query) !== -1;
          var hasMatchingRoute = false;
          var kinds = ['page', 'route'];
          for (var j = 0; j < kinds.length; j += 1) {
            var file = node[kinds[j]];
            if (file && matchesFilter(file) && (!query || searchText({ segment: '', url: '', page: file, isGroup: false, isSlot: false, _hasContent: true, children: [], boundaries: { layouts: [] } }).indexOf(query) !== -1)) {
              hasMatchingRoute = true;
            }
          }

          if (!selfMatches && !hasMatchingRoute && kids.length === 0) return null;

          var clone = Object.assign({}, node, { children: kids });
          if (activeFilter !== 'all' && !query) {
            for (var k = 0; k < kinds.length; k += 1) {
              var fk = kinds[k];
              var pageFile = node[fk];
              if (pageFile && !matchesFilter(pageFile)) clone[fk] = undefined;
            }
          }
          return clone;
        }

        function openAll() {
          var details = treeEl.querySelectorAll('details');
          for (var i = 0; i < details.length; i += 1) details[i].open = true;
        }

        function closeAll() {
          var details = treeEl.querySelectorAll('details');
          for (var i = 0; i < details.length; i += 1) details[i].open = false;
        }

        function openDrawer() {
          drawer.classList.remove('translate-x-full');
          drawer.classList.add('translate-x-0');
          backdrop.classList.remove('hidden');
        }

        function closeDrawer() {
          drawer.classList.add('translate-x-full');
          drawer.classList.remove('translate-x-0');
          backdrop.classList.add('hidden');
          activeKey = null;
          render();
        }

        function showDetails(record) {
          activeKey = record.node.url + ':' + record.file.kind;
          var node = record.node;
          var file = record.file;
          drawerTitle.innerHTML = paintUrl(node.url);

          var rows = [
            ['File', file.relativePath],
            ['Kind', file.kind === 'route' ? 'Route handler' : 'Page'],
            ['Rendering', file._engine ? file._engine.label : '—'],
            ['Runtime', file.runtime === 'edge' ? 'Edge' : file.runtime === 'nodejs' ? 'Node.js' : 'Auto (Node.js)'],
            ['Dynamic config', file.dynamic || 'auto'],
            ['Revalidate', file.revalidate === undefined ? 'default' : file.revalidate === false ? 'false (static)' : file.revalidate + 's'],
            ['Component', file._bounds ? file._bounds.label : (file.client ? 'Client' : 'Server')],
            ['Layouts', node.boundaries.layouts.length ? node.boundaries.layouts.map(function (l) { return l.relativePath; }).join(', ') : 'none'],
            ['Loading', node.boundaries.loading ? node.boundaries.loading.relativePath : 'none'],
            ['Error', node.boundaries.error ? node.boundaries.error.relativePath : 'none'],
          ];

          var html = '<dl class="space-y-4">';
          for (var i = 0; i < rows.length; i += 1) {
            html += '<div><dt class="text-[10px] uppercase tracking-[0.18em] text-zinc-500">' + esc(rows[i][0]) + '</dt><dd class="mt-1 whitespace-pre-wrap break-all text-[12px] text-zinc-300">' + esc(rows[i][1]) + '</dd></div>';
          }
          html += '</dl>';
          if (file._engine || file.client) {
            html += '<div class="mt-5 flex flex-wrap gap-1">' + routeBadges(file) + '</div>';
          }
          drawerBody.innerHTML = html;
          openDrawer();
        }

        function render() {
          routes = {};
          var filtered = query || activeFilter !== 'all' ? filterNode(data.root) : data.root;
          if (!filtered || (!filtered._hasContent && filtered.children.length === 0)) {
            treeEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
            return;
          }
          emptyEl.classList.add('hidden');
          treeEl.innerHTML = renderNode(filtered, 0);
          if (query || activeFilter !== 'all') openAll();
        }

        function renderStats() {
          var stats = data.stats || {};
          var items = [
            ['Routes', (stats.pages || 0) + (stats.routes || 0)],
            ['Layouts', stats.layouts || 0],
            ['Loading', stats.loading || 0],
            ['Errors', stats.errors || 0],
            ['Client', stats.client || 0],
            ['Edge', stats.edge || 0],
          ];
          var html = '';
          for (var i = 0; i < items.length; i += 1) {
            html += '<div class="rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5"><span class="text-[13px] font-semibold text-white">' + esc(items[i][1]) + '</span> <span class="text-[10px] text-zinc-500">' + esc(items[i][0]) + '</span></div>';
          }
          statsEl.innerHTML = html;
        }

        function renderWarnings() {
          if (!data.warnings || data.warnings.length === 0) return;
          var list = '';
          for (var i = 0; i < data.warnings.length; i += 1) {
            list += '<li class="py-0.5">' + esc(data.warnings[i]) + '</li>';
          }
          warningsEl.innerHTML = '<p class="mb-1 font-medium text-amber-300">' + esc(data.warnings.length) + ' warning(s)</p><ul class="list-disc space-y-0.5 pl-4 text-amber-200/80">' + list + '</ul>';
          warningsEl.classList.remove('hidden');
        }

        function updateFilterButtons() {
          var buttons = document.querySelectorAll('.filter-chip');
          for (var i = 0; i < buttons.length; i += 1) {
            buttons[i].setAttribute('data-active', buttons[i].getAttribute('data-filter') === activeFilter ? 'true' : 'false');
          }
        }

        treeEl.addEventListener('click', function (event) {
          var target = event.target;
          if (!(target instanceof Element)) return;
          var routeButton = target.closest('[data-route]');
          if (routeButton) {
            var routeKey = routeButton.getAttribute('data-route');
            if (routeKey && routes[routeKey]) {
              showDetails(routes[routeKey]);
              render();
            }
            return;
          }
        });

        searchEl.addEventListener('input', function () {
          query = searchEl.value.trim().toLowerCase();
          render();
        });

        document.querySelectorAll('.filter-chip').forEach(function (button) {
          button.addEventListener('click', function () {
            activeFilter = button.getAttribute('data-filter') || 'all';
            updateFilterButtons();
            render();
          });
        });

        document.getElementById('expand-all').addEventListener('click', openAll);
        document.getElementById('collapse-all').addEventListener('click', closeAll);
        drawerClose.addEventListener('click', closeDrawer);
        backdrop.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape') closeDrawer();
        });

        renderStats();
        renderWarnings();
        updateFilterButtons();
        render();
      })();
    </script>
  </body>
</html>`;
}

export function renderRouteMapErrorHtml(message: string, config: TemplateConfig): string {
  const safeMessage = escapeHtml(message);
  const safeBasePath = escapeHtml(config.basePath);

  return `<!doctype html>
<html lang="en" class="h-full bg-zinc-950">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>next-graph · error</title>
    <style>
      body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #09090b; color: #e4e4e7; line-height: 1.6; }
      .wrap { max-width: 640px; margin: 0 auto; padding: 64px 24px; }
      h1 { font-size: 20px; margin: 0 0 16px; color: #fb7185; }
      pre { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; overflow: auto; color: #a1a1aa; }
      p { color: #71717a; }
      a { color: #22d3ee; }
      code { background: #18181b; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>next-graph failed to scan your app</h1>
      <pre>${safeMessage}</pre>
      <p>Make sure you run this from a Next.js project root with an <code>app/</code> or <code>src/app/</code> directory, and that TypeScript is installed.</p>
      <p><a href="${safeBasePath}">Back to ${safeBasePath}</a></p>
    </div>
  </body>
</html>`;
}

function enrichMap(map: RouteMap): PresentedMap {
  const clone = JSON.parse(JSON.stringify(map)) as PresentedMap;
  enrichNode(clone.root);
  return clone;
}

function enrichNode(node: PresentedNode): void {
  const boundaryChips = [];
  for (const kind of ['layout', 'loading', 'error'] as const) {
    const file = node[kind];
    if (!file) continue;
    const info = getBoundaryChipInfo(file, node.segment);
    boundaryChips.push({
      kind,
      icon: info.icon,
      label: info.label,
      name: info.name,
      runtime: file.runtime,
      client: file.client,
    });
  }

  node._boundaryChips = boundaryChips;

  for (const kind of ['page', 'route'] as const) {
    const file = node[kind];
    if (!file) continue;
    file._engine = getEngineInfo(file, node.isDynamic);
    file._bounds = getBoundsInfo(file);
  }

  node._hasContent = Boolean(
    node.page ??
      node.route ??
      node.layout ??
      node.loading ??
      node.error ??
      node.children.length > 0,
  );

  for (const child of node.children) {
    enrichNode(child);
  }
}

function serializeForInlineScript(value: unknown): string {
  const json = JSON.stringify(value) ?? 'null';
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
