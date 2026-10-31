import { createColors } from 'picocolors';
import pc from 'picocolors';
import { getBoundaryChipInfo, getBoundsInfo, getEngineInfo } from '../core/presentation';
import type { RouteFile, RouteFileKind, RouteMap, RouteNode } from '../core/types';

export interface RenderTreeOptions {
  /** Force colors on/off. Defaults to picocolors' TTY detection. */
  color?: boolean;
}

type Painter = ReturnType<typeof createColors>;

type BranchKind = 'structure' | 'leaf';

interface TreeItem {
  kind: BranchKind;
  label: string;
  children: TreeItem[];
}

export function renderRouteTree(map: RouteMap, options: RenderTreeOptions = {}): string {
  const c: Painter = options.color === false ? createColors(false) : pc;
  const lines: string[] = [];

  lines.push(`${c.bold(c.cyan('/'))} ${c.dim('(Root)')}`);

  const ownLeaves = buildRootLeaves(map.root, c);
  if (ownLeaves.length > 0) {
    lines.push(...drawItems(ownLeaves, '', c));
  }

  const dirChildren: TreeItem[] = [];
  for (const child of map.root.children) {
    dirChildren.push(buildDirectoryNode(child, c));
  }
  if (dirChildren.length > 0) {
    if (ownLeaves.length > 0) lines.push('');
    lines.push(...drawItems(dirChildren, '', c));
  }

  if (map.warnings.length > 0) {
    lines.push('');
    lines.push(c.yellow(`⚠ ${map.warnings.length} warning${map.warnings.length === 1 ? '' : 's'}`));
    for (const warning of map.warnings) {
      lines.push(c.dim(`  · ${warning}`));
    }
  }

  return lines.join('\n');
}

function buildRootLeaves(node: RouteNode, c: Painter): TreeItem[] {
  const ownLeaves: TreeItem[] = [];

  if (node.layout) ownLeaves.push(boundaryLeaf(node.layout, node.segment, c));
  if (node.loading) ownLeaves.push(boundaryLeaf(node.loading, node.segment, c));
  if (node.error) ownLeaves.push(boundaryLeaf(node.error, node.segment, c));
  if (node.page) ownLeaves.push(pageLeaf(node, node.page, c));
  if (node.route) ownLeaves.push(pageLeaf(node, node.route, c));

  return ownLeaves;
}

function buildDirectoryNode(node: RouteNode, c: Painter): TreeItem {
  const target = collapseEmptyDirectory(node);

  const children: TreeItem[] = [];

  if (target.layout) children.push(boundaryLeaf(target.layout, target.segment, c));
  if (target.loading) children.push(boundaryLeaf(target.loading, target.segment, c));
  if (target.error) children.push(boundaryLeaf(target.error, target.segment, c));
  if (target.page) children.push(pageLeaf(target, target.page, c));
  if (target.route) children.push(pageLeaf(target, target.route, c));

  for (const child of target.children) {
    children.push(buildDirectoryNode(child, c));
  }

  return {
    kind: 'structure',
    label: directoryLabel(target, c),
    children,
  };
}

function collapseEmptyDirectory(node: RouteNode): RouteNode {
  let current = node;
  while (!hasOwnFiles(current) && current.children.length === 1) {
    const [child] = current.children;
    if (!child || child.isGroup || child.isSlot) break;
    current = child;
  }
  return current;
}

function hasOwnFiles(node: RouteNode): boolean {
  return Boolean(node.layout ?? node.loading ?? node.error ?? node.page ?? node.route);
}

function boundaryLeaf(file: RouteFile, segment: string, c: Painter): TreeItem {
  const info = getBoundaryChipInfo(file, segment);
  const color = boundaryColor(file.kind, c);
  return {
    kind: 'leaf',
    label: `${info.icon} ${color(info.name)}`,
    children: [],
  };
}

function pageLeaf(node: RouteNode, file: RouteFile, c: Painter): TreeItem {
  const icon = file.kind === 'route' ? '🔗' : '📄';
  const url = paintUrl(node.url, c);
  const engine = getEngineInfo(file, node.isDynamic);
  const bounds = getBoundsInfo(file);

  return {
    kind: 'leaf',
    label: `${icon} ${url}`,
    children: [
      { kind: 'leaf', label: `${c.dim('Engine:')} ${engine.label}`, children: [] },
      {
        kind: 'leaf',
        label: `${c.dim('Bounds:')} ${bounds.icon ? `${bounds.icon} ` : ''}${bounds.label}`,
        children: [],
      },
    ],
  };
}

function directoryLabel(node: RouteNode, c: Painter): string {
  if (node.isGroup) return c.gray(c.italic(node.segment));
  if (node.isSlot) return c.magenta(node.segment);
  return paintUrl(node.url, c);
}

function paintUrl(url: string, c: Painter): string {
  if (url === '/') return c.bold(c.cyan('/'));

  return url
    .split('/')
    .map((segment, index) => {
      if (segment === '' && index === 0) return '';
      return isDynamicSegment(segment) ? c.yellow(segment) : c.bold(c.cyan(segment));
    })
    .join(c.dim('/'));
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith('[') && segment.endsWith(']');
}

function boundaryColor(kind: RouteFileKind, c: Painter): (text: string) => string {
  switch (kind) {
    case 'error':
      return c.red;
    case 'loading':
      return c.magenta;
    default:
      return c.bold;
  }
}

function drawItems(items: TreeItem[], prefix: string, c: Painter): string[] {
  const lines: string[] = [];

  const walk = (nodes: TreeItem[], currentPrefix: string) => {
    nodes.forEach((node, index) => {
      const last = index === nodes.length - 1;
      const connector = node.kind === 'structure' ? (last ? '└── ' : '├── ') : last ? '└─ ' : '├─ ';
      lines.push(`${currentPrefix}${c.dim(connector)}${node.label}`);

      if (node.children.length > 0) {
        const childPrefixBase =
          node.kind === 'structure' ? (last ? '    ' : '│   ') : last ? '   ' : '│  ';
        walk(node.children, `${currentPrefix}${childPrefixBase}`);
      }
    });
  };

  walk(items, prefix);
  return lines;
}
