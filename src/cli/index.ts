import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import pc from 'picocolors';
import { scanApp } from '../core/scanner';
import { renderRouteTree } from './tree';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version?: string };
const VERSION = pkg.version ?? '0.0.0';

interface CliOptions {
  cwd: string;
  json: boolean;
  help: boolean;
  version: boolean;
  color?: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    cwd: process.cwd(),
    json: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument) continue;

    if (argument === '-h' || argument === '--help') {
      options.help = true;
    } else if (argument === '-v' || argument === '--version') {
      options.version = true;
    } else if (argument === '--json') {
      options.json = true;
    } else if (argument === '--no-color') {
      options.color = false;
    } else if (argument === '-d' || argument === '--dir') {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a path.`);
      options.cwd = resolve(value);
      index += 1;
    } else if (argument.startsWith('--dir=')) {
      const value = argument.slice('--dir='.length);
      if (!value) throw new Error('--dir requires a path.');
      options.cwd = resolve(value);
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else {
      options.cwd = resolve(argument);
    }
  }

  return options;
}

function helpText(): string {
  return `
  ${pc.bold(pc.cyan('next-graph'))} ${pc.dim(`v${VERSION}`)}

  ${pc.dim('Architecture & rendering analyzer for the Next.js App Router.')}

  ${pc.bold('Usage')}
    $ next-graph [path] [options]

  ${pc.bold('Options')}
    -d, --dir <path>   Project directory to scan (default: current directory)
        --json         Print the route map as JSON
        --no-color     Disable colored output
    -h, --help         Show this help
    -v, --version      Show the version

  ${pc.bold('Examples')}
    $ npx next-graph
    $ npx next-graph ./apps/web
    $ npx next-graph --json > route-map.json
`.trimStart();
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(helpText());
    return;
  }
  if (options.version) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const routeMap = await scanApp({ cwd: options.cwd });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(routeMap, null, 2)}\n`);
    return;
  }

  const output = renderRouteTree(routeMap, { color: options.color });
  process.stdout.write(`${output}\n`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${pc.red('✖')} ${message}\n`);
  process.exitCode = 1;
});
