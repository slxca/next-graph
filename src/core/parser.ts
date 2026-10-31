import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import type { RouteDynamic, RouteRuntime } from './types';

export interface ParsedRouteModule {
  client: boolean;
  runtime?: RouteRuntime;
  dynamic?: RouteDynamic;
  revalidate?: number | false;
}

const RUNTIMES = new Set<string>(['edge', 'nodejs']);
const DYNAMICS = new Set<string>(['auto', 'force-dynamic', 'error', 'force-static']);

export async function parseRouteModule(filePath: string): Promise<ParsedRouteModule> {
  const source = await readFile(filePath, 'utf8');
  return parseRouteModuleSource(source, filePath);
}

export function parseRouteModuleSource(source: string, fileName = 'route.tsx'): ParsedRouteModule {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    kindForFile(fileName),
  );

  const parsed: ParsedRouteModule = { client: hasDirective(sourceFile, 'use client') };
  const locals = new Map<string, ts.Expression>();
  const exported = new Map<string, ts.Expression>();

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      const isExported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        locals.set(declaration.name.text, declaration.initializer);
        if (isExported) exported.set(declaration.name.text, declaration.initializer);
      }
    } else if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const element of statement.exportClause.elements) {
        const localName = element.propertyName?.text ?? element.name.text;
        const initializer = locals.get(localName);
        if (initializer) exported.set(element.name.text, initializer);
      }
    }
  }

  const runtime = readString(exported.get('runtime'));
  if (runtime === 'experimental-edge') parsed.runtime = 'edge';
  else if (runtime && RUNTIMES.has(runtime)) parsed.runtime = runtime as RouteRuntime;

  const dynamic = readString(exported.get('dynamic'));
  if (dynamic && DYNAMICS.has(dynamic)) parsed.dynamic = dynamic as RouteDynamic;

  const revalidate = readRevalidate(exported.get('revalidate'));
  if (revalidate !== undefined) parsed.revalidate = revalidate;

  return parsed;
}

function kindForFile(fileName: string): ts.ScriptKind {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function hasDirective(sourceFile: ts.SourceFile, directive: string): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (statement.expression.text === directive) return true;
  }
  return false;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (
    (ts.canHaveModifiers(node) && node.modifiers?.some((modifier) => modifier.kind === kind)) ??
    false
  );
}

function unwrap(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function readString(expression: ts.Expression | undefined): string | undefined {
  if (!expression) return undefined;
  const node = unwrap(expression);
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function readRevalidate(expression: ts.Expression | undefined): number | false | undefined {
  if (!expression) return undefined;
  const node = unwrap(expression);
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isNumericLiteral(node)) {
    const value = Number(node.text);
    return Number.isFinite(value) ? value : undefined;
  }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  ) {
    return -Number(node.operand.text);
  }
  return undefined;
}
