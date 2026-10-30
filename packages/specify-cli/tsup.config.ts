import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  dts: {
    // tsup's declaration build uses the workspace TypeScript 6 installation.
    compilerOptions: { ignoreDeprecations: '6.0' },
  },
  outDir: 'dist',
});
