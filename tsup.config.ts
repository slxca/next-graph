import { defineConfig } from 'tsup';

const shared = {
  target: 'node18',
  platform: 'node' as const,
  bundle: true,
  splitting: false,
  sourcemap: true,
  external: ['typescript', 'next'],
  outDir: 'dist',
};

export default defineConfig([
  {
    ...shared,
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    dts: false,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    ...shared,
    entry: {
      core: 'src/core/scanner.ts',
      server: 'src/server/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
  },
]);
